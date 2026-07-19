using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth;

// MASTER §9.4/§11.2: POST /auth/forgot-password — the single recovery
// entry point for Owner/Prorab/Accountant ("забыл пароль = потерял доступ
// к системе, где считается зарплата"). Always succeeds regardless of
// whether the phone exists — "не раскрывать, кто есть в системе" — so the
// handler itself can never fail; a nonexistent/inactive user is a silent
// no-op, not a different response shape an attacker could distinguish.
public sealed record ForgotPasswordCommand(string Phone) : IRequest<Result>;

public sealed class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.Phone).NotEmpty();
    }
}

public sealed class ForgotPasswordCommandHandler(
    IApplicationDbContext context,
    IPasswordResetDeliveryService deliveryService) : IRequestHandler<ForgotPasswordCommand, Result>
{
    public async Task<Result> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        // No authenticated context exists on this route by definition —
        // same IgnoreQueryFilters() reasoning as Login/RefreshToken.
        var user = await context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Phone == request.Phone, cancellationToken);

        if (user is null || !user.IsActive)
            return Result.Success();

        // Single-tenant assumption, same as LoginCommand's own CompanyId
        // lookup — one Company row per deployment in this MVP.
        var companyId = await context.Companies.Select(c => c.Id).FirstAsync(cancellationToken);

        var plainToken = RefreshTokenGenerator.GenerateToken();
        var tokenHash = RefreshTokenGenerator.Hash(plainToken);
        var expiresAt = DateTimeOffset.UtcNow.AddHours(1);

        var resetToken = PasswordResetToken.Create(companyId, user.Id, tokenHash, expiresAt);
        context.PasswordResetTokens.Add(resetToken);
        await context.SaveChangesAsync(cancellationToken);

        var hasTelegramLink = await context.TelegramLinks
            .IgnoreQueryFilters()
            .AnyAsync(t => t.UserId == user.Id, cancellationToken);

        await deliveryService.DeliverAsync(user.Id, user.Phone, plainToken, hasTelegramLink, cancellationToken);

        return Result.Success();
    }
}
