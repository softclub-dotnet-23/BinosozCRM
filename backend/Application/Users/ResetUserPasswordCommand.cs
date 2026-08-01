using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// An Owner supplies the new secret directly; unlike the invitation-password
// flow, there is no generated credential and nothing secret enters an audit
// record or response body.
public sealed record ResetUserPasswordCommand(Guid UserId, string NewPassword) : IRequest<Result>;

public sealed class ResetUserPasswordCommandValidator : AbstractValidator<ResetUserPasswordCommand>
{
    public ResetUserPasswordCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        // Keep this exactly aligned with ChangePasswordCommand and the token
        // reset flow until password policy is promoted to a shared option.
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}

public sealed class ResetUserPasswordCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    ICurrentUserService currentUser)
    : IRequestHandler<ResetUserPasswordCommand, Result>
{
    public async Task<Result> Handle(ResetUserPasswordCommand request, CancellationToken cancellationToken)
    {
        // The controller policy is the primary HTTP boundary. Retaining the
        // same rule here prevents a future non-HTTP caller from accidentally
        // turning a privileged operation into an unguarded MediatR call.
        if (currentUser.Role != Role.Owner || currentUser.CompanyId is null || currentUser.UserId is null)
            return Result.Failure(new Error("AUTH_FORBIDDEN", "Only an Owner can reset user passwords."));

        // User now implements ICompanyOwned, so the context filter makes an
        // inaccessible cross-company target indistinguishable from absent.
        var user = await context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure(new Error("USER_NOT_FOUND", "User not found."));

        // Explicitly clear a bootstrap-only force-change flag: the Owner has
        // supplied a final password, not a temporary secret. The plaintext is
        // used only by the hasher and is never placed in a log/audit payload.
        user.SetPassword(passwordHasher.Hash(request.NewPassword));

        var now = DateTimeOffset.UtcNow;
        var activeRefreshTokens = await context.RefreshTokens
            .IgnoreQueryFilters()
            .Where(rt => rt.CompanyId == user.CompanyId && rt.UserId == user.Id && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var refreshToken in activeRefreshTokens)
            refreshToken.Revoke(now);

        context.AdminAuditLogs.Add(AdminAuditLog.Create(
            user.CompanyId,
            currentUser.UserId.Value,
            AdminAuditAction.OwnerPasswordReset,
            nameof(User),
            user.Id,
            now));

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
