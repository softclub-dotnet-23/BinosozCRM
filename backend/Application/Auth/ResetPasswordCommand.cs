using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth;

// MASTER §9.4/§11.2: POST /auth/reset-password. One error code for every
// failure mode (missing token, already used, expired) — same
// don't-help-an-attacker-narrow-it-down reasoning as
// AUTH_INVALID_CREDENTIALS. "Смена пароля + отзыв ВСЕХ refresh-токенов
// пользователя" — every active session dies the moment the password
// changes, same revoke-the-whole-chain mechanism RefreshTokenCommand uses
// for reuse detection (Domain.Common's RefreshToken.Revoke), just
// triggered here instead of by a stolen-token signal.
public sealed record ResetPasswordCommand(string Token, string NewPassword) : IRequest<Result>;

public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}

public sealed class ResetPasswordCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    : IRequestHandler<ResetPasswordCommand, Result>
{
    public async Task<Result> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenGenerator.Hash(request.Token);

        var resetToken = await context.PasswordResetTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (resetToken is null || resetToken.UsedAt is not null || resetToken.ExpiresAt < DateTimeOffset.UtcNow)
            return Result.Failure(InvalidToken());

        var user = await context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == resetToken.UserId, cancellationToken);
        if (user is null || !user.IsActive)
            return Result.Failure(InvalidToken());

        user.SetPassword(passwordHasher.Hash(request.NewPassword));

        var now = DateTimeOffset.UtcNow;
        var activeRefreshTokens = await context.RefreshTokens
            .IgnoreQueryFilters()
            .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var refreshToken in activeRefreshTokens)
            refreshToken.Revoke(now);

        resetToken.MarkUsed(now);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static Error InvalidToken() => new("AUTH_RESET_TOKEN_INVALID", "This reset token is invalid, expired, or already used.");
}
