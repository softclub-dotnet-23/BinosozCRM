using Application.Common.Interfaces;
using Application.Common.Notifications;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// AGENTS.md Rule 3 ("never negotiable"): every status transition writes
// TaskLog in the same transaction as the transition itself, not as a
// follow-up. Centralized so all seven WorkOrder transition handlers apply
// it identically instead of six copies risking drift, and so xmin conflicts
// (MASTER §9.2 CONCURRENCY_CONFLICT) are handled in exactly one place.
// Also fires WorkOrderStatusChanged (MASTER §9.4) — strictly after
// SaveChanges succeeds, never before, and only on the success path (a
// failed/rolled-back transition never got recorded, so nothing to notify).
internal static class WorkOrderTransitionHelper
{
    public static async Task<Result<WorkOrderDto>> ApplyAsync(
        IApplicationDbContext context,
        IRealtimeNotifier notifier,
        WorkOrder workOrder,
        Func<Result> transition,
        Guid changedByUserId,
        string? comment,
        CancellationToken cancellationToken)
    {
        var fromStatus = workOrder.Status.ToString();

        var transitionResult = transition();
        if (transitionResult.IsFailure)
            return Result.Failure<WorkOrderDto>(transitionResult.Error);

        var toStatus = workOrder.Status.ToString();
        var changedAt = DateTimeOffset.UtcNow;
        context.TaskLogs.Add(TaskLog.Create(
            workOrder.CompanyId,
            TaskLogEntityType.WorkOrder,
            workOrder.Id,
            fromStatus,
            toStatus,
            changedByUserId,
            changedAt,
            comment));

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result.Failure<WorkOrderDto>(new Error(
                "CONCURRENCY_CONFLICT", "The work order was modified by someone else. Reload and try again."));
        }

        await notifier.NotifyWorkOrderStatusChangedAsync(
            workOrder.CompanyId,
            workOrder.BrigadeId,
            new WorkOrderStatusChangedNotification(workOrder.Id, workOrder.Code, fromStatus, toStatus, changedAt),
            cancellationToken);

        return Result.Success(WorkOrderDto.FromEntity(workOrder));
    }
}
