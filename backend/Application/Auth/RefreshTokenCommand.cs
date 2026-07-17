using Application.Common.Interfaces;
using Application.Common.Options;
using Application.Common.Security;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Application.Auth;

public sealed record RefreshTokenCommand(string RefreshToken, string IpAddress) : IRequest<Result<AuthTokensDto>>;

public sealed class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}

public sealed class RefreshTokenCommandHandler(
    IApplicationDbContext context,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions)
    : IRequestHandler<RefreshTokenCommand, Result<AuthTokensDto>>
{
    public async Task<Result<AuthTokensDto>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenGenerator.Hash(request.RefreshToken);

        // No access token exists yet at this point in the flow (that's what we're
        // here to get) — ICurrentUserService.CompanyId is null, so the CompanyId
        // global filter would hide every row. Bypass it deliberately for the
        // refresh-token lookups; this is the one place in the system with no
        // authenticated context by definition.
        var existing = await context.RefreshTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (existing is null)
            return Result.Failure<AuthTokensDto>(InvalidToken());

        if (existing.RevokedAt is not null)
        {
            // A revoked token being presented again is the one reliable signal of
            // theft (MASTER §11.1) — revoke every still-active token for this user.
            var now = DateTimeOffset.UtcNow;
            var activeChain = await context.RefreshTokens
                .IgnoreQueryFilters()
                .Where(rt => rt.UserId == existing.UserId && rt.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var token in activeChain)
                token.Revoke(now);

            await context.SaveChangesAsync(cancellationToken);

            return Result.Failure<AuthTokensDto>(new Error(
                "AUTH_REFRESH_TOKEN_REUSED",
                "This refresh token was already used. All sessions for this account have been revoked."));
        }

        if (existing.ExpiresAt < DateTimeOffset.UtcNow)
            return Result.Failure<AuthTokensDto>(InvalidToken());

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == existing.UserId, cancellationToken);
        if (user is null || !user.IsActive)
            return Result.Failure<AuthTokensDto>(InvalidToken());

        var companyId = existing.CompanyId;
        var (accessToken, accessTokenExpiresAt) = jwtTokenService.GenerateAccessToken(user, companyId);

        var newTokenPlain = RefreshTokenGenerator.GenerateToken();
        var newRefreshToken = RefreshToken.Create(
            companyId,
            user.Id,
            RefreshTokenGenerator.Hash(newTokenPlain),
            DateTimeOffset.UtcNow.AddDays(jwtOptions.Value.RefreshTokenDays),
            request.IpAddress);

        context.RefreshTokens.Add(newRefreshToken);
        existing.Revoke(DateTimeOffset.UtcNow, newRefreshToken.Id);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(new AuthTokensDto(accessToken, accessTokenExpiresAt, newTokenPlain, user.ForcePasswordChange));
    }

    private static Error InvalidToken() =>
        new("AUTH_REFRESH_TOKEN_INVALID", "Refresh token is invalid, expired, or revoked.");
}
