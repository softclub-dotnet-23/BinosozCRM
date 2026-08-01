using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

public sealed record DeactivateUserCommand(Guid UserId) : IRequest<Result<UserDto>>;

public sealed class DeactivateUserCommandValidator : AbstractValidator<DeactivateUserCommand>
{
    public DeactivateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public sealed class DeactivateUserCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<DeactivateUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(DeactivateUserCommand request, CancellationToken cancellationToken)
    {
        // Same self-lockout guard as ChangeUserRoleCommand — the last Owner
        // deactivating themselves would leave no one who can reactivate
        // anyone, on a table only Owner can touch at all (MASTER §12).
        if (request.UserId == currentUser.UserId)
            return Result.Failure<UserDto>(new Error("CANNOT_MODIFY_OWN_ACCOUNT", "You cannot deactivate your own account."));

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure<UserDto>(new Error("USER_NOT_FOUND", "User not found."));

        user.Deactivate();

        // AccountActiveMiddleware already blocks every subsequent request for
        // a deactivated user by DB read, but revoking outstanding refresh
        // tokens too closes the (small) window where a valid refresh token
        // could otherwise mint a fresh access token before the DB read
        // catches up — same defense-in-depth ResetPasswordCommand already
        // uses for password changes.
        var now = DateTimeOffset.UtcNow;
        var activeRefreshTokens = await context.RefreshTokens
            .IgnoreQueryFilters()
            .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var refreshToken in activeRefreshTokens)
            refreshToken.Revoke(now);

        var auditEntry = AdminAuditLog.Create(
            currentUser.CompanyId!.Value, currentUser.UserId!.Value, AdminAuditAction.UserDeactivated,
            nameof(User), user.Id, now);
        context.AdminAuditLogs.Add(auditEntry);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(UserDto.FromEntity(user));
    }
}
