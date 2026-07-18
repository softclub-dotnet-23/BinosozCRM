using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// Mirrors Application.WorkOrders.WorkOrderTransitionHelper — same Rule 3
// (TaskLog in the same transaction as the transition) and xmin-concurrency
// handling, just for IndividualTask's DTO/entity type. Kept separate rather
// than genericized for now; revisit if a third state-machine entity needs
// the same shape.
internal static class IndividualTaskTransitionHelper
{
    public static async Task<Result<IndividualTaskDto>> ApplyAsync(
        IApplicationDbContext context,
        IndividualTask task,
        Func<Result> transition,
        Guid changedByUserId,
        CancellationToken cancellationToken)
    {
        var fromStatus = task.Status.ToString();

        var transitionResult = transition();
        if (transitionResult.IsFailure)
            return Result.Failure<IndividualTaskDto>(transitionResult.Error);

        var toStatus = task.Status.ToString();
        context.TaskLogs.Add(TaskLog.Create(
            task.CompanyId,
            TaskLogEntityType.IndividualTask,
            task.Id,
            fromStatus,
            toStatus,
            changedByUserId,
            DateTimeOffset.UtcNow));

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result.Failure<IndividualTaskDto>(new Error(
                "CONCURRENCY_CONFLICT", "The task was modified by someone else. Reload and try again."));
        }

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
