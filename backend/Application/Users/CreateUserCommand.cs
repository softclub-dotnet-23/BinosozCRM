using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// No email/SMS channel exists to hand a new user their first password, and a
// brand-new user has no TelegramLink yet either (that's user-initiated, after
// their first login) — user decision (frontend-integration Users module,
// 2026-07-31): the server generates a random temporary password and returns
// it once in the response body. Never persisted in plaintext, never logged
// (TemporaryPassword lives only on CreateUserResult, not on UserDto or any
// entity), ForcePasswordChange=true forces an immediate change.
public sealed record CreateUserCommand(string FullName, string Phone, Role Role) : IRequest<Result<CreateUserResult>>;

public sealed record CreateUserResult(UserDto User, string TemporaryPassword);

public sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Role).IsInEnum();
    }
}

public sealed class CreateUserCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    ICurrentUserService currentUser)
    : IRequestHandler<CreateUserCommand, Result<CreateUserResult>>
{
    public async Task<Result<CreateUserResult>> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        if (await context.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Phone == request.Phone, cancellationToken))
            return Result.Failure<CreateUserResult>(new Error("PHONE_ALREADY_IN_USE", "A user with this phone number already exists."));

        var temporaryPassword = TemporaryPasswordGenerator.Generate();
        var user = User.Create(
            currentUser.CompanyId!.Value,
            request.FullName,
            request.Phone,
            passwordHasher.Hash(temporaryPassword),
            request.Role,
            forcePasswordChange: true);
        context.Users.Add(user);

        var auditEntry = AdminAuditLog.Create(
            currentUser.CompanyId!.Value, currentUser.UserId!.Value, AdminAuditAction.UserCreated,
            nameof(User), user.Id, DateTimeOffset.UtcNow);
        context.AdminAuditLogs.Add(auditEntry);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(new CreateUserResult(UserDto.FromEntity(user), temporaryPassword));
    }
}
