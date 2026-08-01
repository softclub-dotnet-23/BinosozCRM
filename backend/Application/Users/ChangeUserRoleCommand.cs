using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

public sealed record ChangeUserRoleCommand(Guid UserId, Role NewRole) : IRequest<Result<UserDto>>;

public sealed class ChangeUserRoleCommandValidator : AbstractValidator<ChangeUserRoleCommand>
{
    public ChangeUserRoleCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.NewRole).IsInEnum();
    }
}

public sealed class ChangeUserRoleCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ChangeUserRoleCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(ChangeUserRoleCommand request, CancellationToken cancellationToken)
    {
        // Never trust the frontend alone to block this — an Owner changing
        // their own role could lock every Owner out of user management with
        // no one left who can undo it (MASTER §12: only Owner has any access
        // to User at all).
        if (request.UserId == currentUser.UserId)
            return Result.Failure<UserDto>(new Error("CANNOT_MODIFY_OWN_ACCOUNT", "You cannot change your own role."));

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure<UserDto>(new Error("USER_NOT_FOUND", "User not found."));

        var oldRole = user.Role;
        user.ChangeRole(request.NewRole);

        var auditEntry = AdminAuditLog.Create(
            currentUser.CompanyId!.Value, currentUser.UserId!.Value, AdminAuditAction.RoleChanged,
            nameof(User), user.Id, DateTimeOffset.UtcNow,
            oldValueJson: $"{{\"role\":\"{oldRole}\"}}", newValueJson: $"{{\"role\":\"{request.NewRole}\"}}");
        context.AdminAuditLogs.Add(auditEntry);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(UserDto.FromEntity(user));
    }
}
