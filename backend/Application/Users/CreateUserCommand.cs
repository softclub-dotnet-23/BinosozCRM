using System.Text.Json;
using Application.Common.Interfaces;
using Application.Common.Security;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Users;

// POST /users — Owner only. MASTER (POST /users context): "Любой из трёх Owner заводит
// [Prorab/Brigadir/Accountant] через API, с паролем-приглашением и тем же
// ForcePasswordChange = true. Каждое создание пишется в AdminAuditLog."
public sealed record CreateUserCommand(string FullName, string Phone, Role Role) : IRequest<Result<CreateUserResultDto>>;

public sealed record CreateUserResultDto(UserDto User, string TemporaryPassword);

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
    : IRequestHandler<CreateUserCommand, Result<CreateUserResultDto>>
{
    public async Task<Result<CreateUserResultDto>> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var phoneTaken = await context.Users.AnyAsync(u => u.Phone == request.Phone, cancellationToken);
        if (phoneTaken)
            return Result.Failure<CreateUserResultDto>(new Error("USER_PHONE_ALREADY_EXISTS", "A user with this phone already exists."));

        var companyId = await context.Companies.Select(c => c.Id).FirstAsync(cancellationToken);
        var temporaryPassword = TemporaryPasswordGenerator.Generate();

        var user = User.Create(request.FullName, request.Phone, passwordHasher.Hash(temporaryPassword), request.Role, forcePasswordChange: true);
        context.Users.Add(user);

        // AdminAuditSaveChangesInterceptor only audits Modified User rows (RoleChanged,
        // UserDeactivated) — a brand-new row is Added, not Modified, so UserCreated is written
        // explicitly here, same pattern CreatePayrollAdvanceCommand uses for AdvanceIssued.
        context.AdminAuditLogs.Add(AdminAuditLog.Create(
            companyId,
            currentUser.UserId!.Value,
            AdminAuditAction.UserCreated,
            nameof(User),
            user.Id,
            DateTimeOffset.UtcNow,
            newValueJson: JsonSerializer.Serialize(new { user.FullName, user.Phone, Role = user.Role.ToString() })));

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(new CreateUserResultDto(UserDto.FromEntity(user), temporaryPassword));
    }
}
