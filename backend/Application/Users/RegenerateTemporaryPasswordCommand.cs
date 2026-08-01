using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// User decision (frontend-integration Users module, 2026-07-31): Owner can
// re-roll a user's password if the original one-time reveal was lost —
// revokes every active refresh token for that user (same reasoning as
// ResetPasswordCommand) since whoever had the old password may still hold a
// live session, and forces another change on next login.
public sealed record RegenerateTemporaryPasswordCommand(Guid UserId) : IRequest<Result<CreateUserResult>>;

public sealed class RegenerateTemporaryPasswordCommandValidator : AbstractValidator<RegenerateTemporaryPasswordCommand>
{
    public RegenerateTemporaryPasswordCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public sealed class RegenerateTemporaryPasswordCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    ICurrentUserService currentUser)
    : IRequestHandler<RegenerateTemporaryPasswordCommand, Result<CreateUserResult>>
{
    public async Task<Result<CreateUserResult>> Handle(RegenerateTemporaryPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure<CreateUserResult>(new Error("USER_NOT_FOUND", "User not found."));

        var temporaryPassword = TemporaryPasswordGenerator.Generate();
        user.SetPassword(passwordHasher.Hash(temporaryPassword), forcePasswordChange: true);

        var now = DateTimeOffset.UtcNow;
        var activeRefreshTokens = await context.RefreshTokens
            .IgnoreQueryFilters()
            .Where(rt => rt.UserId == user.Id && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var refreshToken in activeRefreshTokens)
            refreshToken.Revoke(now);

        var auditEntry = AdminAuditLog.Create(
            currentUser.CompanyId!.Value, currentUser.UserId!.Value, AdminAuditAction.TempPasswordRegenerated,
            nameof(User), user.Id, now);
        context.AdminAuditLogs.Add(auditEntry);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(new CreateUserResult(UserDto.FromEntity(user), temporaryPassword));
    }
}
