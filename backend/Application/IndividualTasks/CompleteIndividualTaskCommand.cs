using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §8.5/§7.2: CompletedEarly is computed at closing (comparing
// CompletedAt to DueAt) — never recalculated later, so a retroactive DueAt
// edit can't rewrite history. IndividualTask.Complete() already does this.
//
// §8.7: "Бригадиру сразу предлагается поле «Премия»" at the moment of
// closing — §9.4 has no separate "propose bonus" endpoint, only
// /bonus/approve, so the proposal rides along on this same call rather
// than being invented as its own route. BonusAmount is a draft only:
// IndividualTask.BonusApprovedByUserId stays null until Phase 5 Step 5's
// approve endpoint sets it — "в зарплату не попадает" until then.
public sealed record CompleteIndividualTaskCommand(Guid TaskId, decimal? BonusAmount = null) : IRequest<Result<IndividualTaskDto>>;

public sealed class CompleteIndividualTaskCommandValidator : AbstractValidator<CompleteIndividualTaskCommand>
{
    public CompleteIndividualTaskCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
        RuleFor(x => x.BonusAmount).GreaterThan(0).When(x => x.BonusAmount is not null);
    }
}

public sealed class CompleteIndividualTaskCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CompleteIndividualTaskCommand, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(CompleteIndividualTaskCommand request, CancellationToken cancellationToken)
    {
        var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (callerBrigadeId is null)
            return Result.Failure<IndividualTaskDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);

        if (task is null || task.BrigadeId != callerBrigadeId.Value)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));

        var fromStatus = task.Status;
        var result = task.Complete(DateTimeOffset.UtcNow);
        if (result.IsFailure)
            return Result.Failure<IndividualTaskDto>(result.Error);

        // §8.7 point 1-2: the bonus offer only makes sense for a task that
        // actually finished early — a BonusAmount supplied on a task that
        // didn't is rejected, not silently accepted or silently dropped.
        if (request.BonusAmount is not null)
        {
            if (task.CompletedEarly != true)
                return Result.Failure<IndividualTaskDto>(new Error("BONUS_NOT_ELIGIBLE", "Bonus can only be proposed for a task completed before its due date."));

            var bonusResult = task.ProposeBonus(request.BonusAmount.Value);
            if (bonusResult.IsFailure)
                return Result.Failure<IndividualTaskDto>(bonusResult.Error);
        }

        TaskLogWriter.Append(
            context,
            task.CompanyId,
            TaskLogEntityType.IndividualTask,
            task.Id,
            fromStatus.ToString(),
            task.Status.ToString(),
            currentUser.UserId!.Value);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
