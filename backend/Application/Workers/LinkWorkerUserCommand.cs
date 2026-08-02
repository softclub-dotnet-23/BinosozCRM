using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// Worker-role checkpoint (docs/PROGRESS.md, post-MASTER addition): the
// realistic onboarding path for a Worker or Brigadir login — the Worker
// record already exists (hired before logins existed), an Owner creates a
// new User (existing CreateUserCommand, POST /users) and then links the two
// with this command. Owner-only, same "власть" category §11.7 covers.
public sealed record LinkWorkerUserCommand(Guid WorkerId, Guid UserId) : IRequest<Result>;

public sealed class LinkWorkerUserCommandValidator : AbstractValidator<LinkWorkerUserCommand>
{
    public LinkWorkerUserCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public sealed class LinkWorkerUserCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<LinkWorkerUserCommand, Result>
{
    public async Task<Result> Handle(LinkWorkerUserCommand request, CancellationToken cancellationToken)
    {
        if (currentUser.Role != Role.Owner || currentUser.CompanyId is null || currentUser.UserId is null)
            return Result.Failure(new Error("AUTH_FORBIDDEN", "Only an Owner can link a worker to a user account."));

        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure(new Error("WORKER_NOT_FOUND", "Worker not found."));

        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null || user.CompanyId != worker.CompanyId)
            return Result.Failure(new Error("USER_NOT_FOUND", "User not found."));

        // Only the two roles that are ever "also a Worker" (§4: Brigadir;
        // Worker itself) make sense to link — Owner/Prorab/Accountant are
        // back-office roles with no attendance/payroll identity of their own.
        if (user.Role is not (Role.Worker or Role.Brigadir))
            return Result.Failure(new Error("VALIDATION_FAILED", "Only a Worker or Brigadir account can be linked to a worker record."));

        var alreadyLinkedElsewhere = await context.Workers
            .AnyAsync(w => w.UserId == request.UserId && w.Id != request.WorkerId, cancellationToken);
        if (alreadyLinkedElsewhere)
            return Result.Failure(new Error("VALIDATION_FAILED", "This user account is already linked to a different worker record."));

        var linkResult = worker.LinkUser(request.UserId);
        if (linkResult.IsFailure)
            return linkResult;

        context.AdminAuditLogs.Add(AdminAuditLog.Create(
            worker.CompanyId,
            currentUser.UserId.Value,
            AdminAuditAction.WorkerUserLinked,
            nameof(Worker),
            worker.Id,
            DateTimeOffset.UtcNow));

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
