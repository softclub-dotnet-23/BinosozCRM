using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §9.4/§8.7: POST /individual-tasks/{id}/bonus/approve — Prorab+.
// Point 6: "премия за свою задачу бригадир себе не подтверждает, только
// прораб" — satisfied entirely by role authorization (Brigadir can never
// reach this endpoint, regardless of whose task it is), no extra
// same-person check needed.
//
// Point 4: "подтверждает или меняет сумму." IndividualTask.ApproveBonus()
// takes no amount parameter — to support changing it, an OverrideAmount
// here re-proposes via ProposeBonus() first (Domain doesn't gate that
// call's caller identity), then approves. No Domain change needed.
//
// MASTER §11.5 rule 3: a task created off a WorkOrder carries that order's
// ObjectId — a Prorab approving/changing bonus money for it must be
// assigned to that object, same as every other WorkOrder-scoped handler
// (mirrors WorkOrderAccess.GetForProrabAsync). A personal task (§8.5, no
// WorkOrderId) has no object to scope by at all — company-wide for Prorab,
// same precedent as Worker/Brigade/AbsenceRecord elsewhere in this codebase.
public sealed record ApproveBonusCommand(Guid TaskId, decimal? OverrideAmount) : IRequest<Result<IndividualTaskDto>>;

public sealed class ApproveBonusCommandValidator : AbstractValidator<ApproveBonusCommand>
{
    public ApproveBonusCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
        RuleFor(x => x.OverrideAmount).GreaterThan(0).When(x => x.OverrideAmount is not null);
    }
}

public sealed class ApproveBonusCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveBonusCommand, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(ApproveBonusCommand request, CancellationToken cancellationToken)
    {
        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));

        if (task.WorkOrderId is not null)
        {
            var objectId = await context.WorkOrders
                .Where(w => w.Id == task.WorkOrderId.Value)
                .Select(w => (Guid?)w.ObjectId)
                .FirstOrDefaultAsync(cancellationToken);

            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null && (objectId is null || !allowedObjectIds.Contains(objectId.Value)))
                return Result.Failure<IndividualTaskDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));
        }

        if (request.OverrideAmount is not null)
        {
            var proposeResult = task.ProposeBonus(request.OverrideAmount.Value);
            if (proposeResult.IsFailure)
                return Result.Failure<IndividualTaskDto>(proposeResult.Error);
        }

        var approveResult = task.ApproveBonus(currentUser.UserId!.Value);
        if (approveResult.IsFailure)
            return Result.Failure<IndividualTaskDto>(approveResult.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
