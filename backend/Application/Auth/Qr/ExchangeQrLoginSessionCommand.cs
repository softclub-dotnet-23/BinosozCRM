using Application.Common.Interfaces;
using Application.Common.Options;
using Application.Common.Security;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Application.Auth.Qr;

// POST /api/v1/auth/qr/{sessionId}/exchange — anonymous (the web client still
// has no JWT at this point), but requires the same qrToken secret the web
// itself has held since /start — sessionId alone is never enough (that's the
// whole point of storing only a hash and requiring the raw value here, same
// as every other token exchange in this file). One-time: ExchangedAt is set
// on success and checked on every attempt, same shape as
// PasswordResetToken.UsedAt.
public sealed record ExchangeQrLoginSessionCommand(Guid SessionId, string QrToken, string IpAddress) : IRequest<Result<AuthTokensDto>>;

public sealed class ExchangeQrLoginSessionCommandValidator : AbstractValidator<ExchangeQrLoginSessionCommand>
{
    public ExchangeQrLoginSessionCommandValidator()
    {
        RuleFor(x => x.QrToken).NotEmpty();
    }
}

public sealed class ExchangeQrLoginSessionCommandHandler(
    IApplicationDbContext context,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions)
    : IRequestHandler<ExchangeQrLoginSessionCommand, Result<AuthTokensDto>>
{
    public async Task<Result<AuthTokensDto>> Handle(ExchangeQrLoginSessionCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenGenerator.Hash(request.QrToken);
        var session = await context.QrLoginSessions
            .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.TokenHash == tokenHash, cancellationToken);

        if (session is null || session.ExpiresAt < DateTimeOffset.UtcNow)
            return Result.Failure<AuthTokensDto>(InvalidSession());

        if (session.Status != QrLoginSessionStatus.Approved || session.ExchangedAt is not null)
            return Result.Failure<AuthTokensDto>(InvalidSession());

        // Approved by definition means ApprovedUserId/ApprovedCompanyId were set
        // together in QrLoginApproval.ApproveAsync — never independently null here.
        var userId = session.ApprovedUserId!.Value;
        var companyId = session.ApprovedCompanyId!.Value;

        // No authenticated context exists on this route by definition — same
        // IgnoreQueryFilters() reasoning as Login/RefreshToken.
        var user = await context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || user.IsDeleted || !user.IsActive || user.CompanyId != companyId)
            return Result.Failure<AuthTokensDto>(InvalidSession());

        var (accessToken, accessTokenExpiresAt) = jwtTokenService.GenerateAccessToken(user, companyId);

        var refreshTokenPlain = RefreshTokenGenerator.GenerateToken();
        var refreshToken = RefreshToken.Create(
            companyId,
            user.Id,
            RefreshTokenGenerator.Hash(refreshTokenPlain),
            DateTimeOffset.UtcNow.AddDays(jwtOptions.Value.RefreshTokenDays),
            request.IpAddress);

        context.RefreshTokens.Add(refreshToken);
        session.MarkExchanged(DateTimeOffset.UtcNow);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Two concurrent exchanges of the same Approved session both read
            // ExchangedAt == null before either committed — xmin makes the
            // loser's UPDATE affect zero rows, and SaveChangesAsync's single
            // transaction means the RefreshToken insert above rolls back with
            // it: the loser gets neither a persisted refresh token nor a
            // marked-exchanged session, only ever one AuthTokensDto is ever
            // handed out for one Approved session.
            return Result.Failure<AuthTokensDto>(InvalidSession());
        }

        return Result.Success(new AuthTokensDto(accessToken, accessTokenExpiresAt, refreshTokenPlain, user.ForcePasswordChange, user.Role.ToString()));
    }

    private static Error InvalidSession() =>
        new("AUTH_QR_SESSION_INVALID", "This QR login session is invalid, expired, not yet approved, or already exchanged.");
}
