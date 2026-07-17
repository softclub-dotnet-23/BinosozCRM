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

public sealed record LoginCommand(string Phone, string Password, string IpAddress) : IRequest<Result<AuthTokensDto>>;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Phone).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class LoginCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions)
    : IRequestHandler<LoginCommand, Result<AuthTokensDto>>
{
    public async Task<Result<AuthTokensDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        // Same failure code for "no such user" and "wrong password" — MASTER §9.2
        // deliberately doesn't distinguish, so a bad guess can't confirm a phone exists.
        var user = await context.Users.FirstOrDefaultAsync(u => u.Phone == request.Phone, cancellationToken);
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            return Result.Failure<AuthTokensDto>(new Error("AUTH_INVALID_CREDENTIALS", "Invalid phone or password."));

        if (!user.IsActive)
            return Result.Failure<AuthTokensDto>(new Error("AUTH_ACCOUNT_DEACTIVATED", "This account has been deactivated."));

        var companyId = await context.Companies.Select(c => c.Id).FirstAsync(cancellationToken);
        var (accessToken, accessTokenExpiresAt) = jwtTokenService.GenerateAccessToken(user, companyId);

        var refreshTokenPlain = RefreshTokenGenerator.GenerateToken();
        var refreshToken = RefreshToken.Create(
            companyId,
            user.Id,
            RefreshTokenGenerator.Hash(refreshTokenPlain),
            DateTimeOffset.UtcNow.AddDays(jwtOptions.Value.RefreshTokenDays),
            request.IpAddress);

        context.RefreshTokens.Add(refreshToken);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(new AuthTokensDto(accessToken, accessTokenExpiresAt, refreshTokenPlain, user.ForcePasswordChange));
    }
}
