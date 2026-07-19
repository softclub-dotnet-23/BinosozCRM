using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §8.7 points 2/4/6: Prorab confirms (or changes) the Brigadir-
// proposed bonus amount — never the Brigadir for their own task. That's
// enforced by role alone here (Prorab+ only, Brigadir has no route to this
// action at all), not a per-task ownership check. §12's role matrix names
// no "own object" qualifier for Prorab on IndividualTask (unlike
// ConstructionObject/WorkOrder), and IndividualTask has no direct ObjectId
// to filter by anyway (only an optional WorkOrderId) — so this is
// company-wide for any Prorab+, not object-isolated.
// Built to fulfil Shahrom's "нужно от Ахмада" request (PROGRESS.md, Phase
// 5 Step 5) — his CreatePayrollEntryCommand already sums confirmed
// bonuses, this is the missing caller that can ever set
// BonusApprovedByUserId.
public sealed record ApproveBonusCommand(Guid TaskId) : IRequest<Result<IndividualTaskDto>>;

public sealed class ApproveBonusCommandValidator : AbstractValidator<ApproveBonusCommand>
{
    public ApproveBonusCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
    }
}

public sealed class ApproveBonusCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveBonusCommand, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(ApproveBonusCommand request, CancellationToken cancellationToken)
    {
        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));

        var result = task.ApproveBonus(currentUser.UserId!.Value);
        if (result.IsFailure)
            return Result.Failure<IndividualTaskDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
