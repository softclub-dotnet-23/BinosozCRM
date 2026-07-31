using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

public sealed record ActivateUserCommand(Guid UserId) : IRequest<Result<UserDto>>;

public sealed class ActivateUserCommandValidator : AbstractValidator<ActivateUserCommand>
{
    public ActivateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public sealed class ActivateUserCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ActivateUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(ActivateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null)
            return Result.Failure<UserDto>(new Error("USER_NOT_FOUND", "User not found."));

        user.Activate();

        var auditEntry = AdminAuditLog.Create(
            currentUser.CompanyId!.Value, currentUser.UserId!.Value, AdminAuditAction.UserActivated,
            nameof(User), user.Id, DateTimeOffset.UtcNow);
        context.AdminAuditLogs.Add(auditEntry);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(UserDto.FromEntity(user));
    }
}
