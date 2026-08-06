using Application.Common.Interfaces;
using Application.IndividualTasks;
using Application.Objects;
using Domain.Common;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// Mirrors ProrabObjectAccess/BrigadeAccess (§11.5 rules 2-3: isolation is
// manual, not an EF global filter) for the two roles that touch a specific
// WorkOrder by id: Prorab+ (scoped by ProrabObjectAssignment on the order's
// ObjectId) and Brigadir (scoped to their own BrigadeId, via their linked
// Worker row). Both a genuinely missing order and one outside the caller's
// scope return the same WORK_ORDER_NOT_FOUND — §4's "не видит чужие
// бригады/объекты (404, не 403)".
internal static class WorkOrderAccess
{
    public static async Task<Result<WorkOrder>> GetForProrabAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        Guid workOrderId,
        CancellationToken cancellationToken)
    {
        var order = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == workOrderId, cancellationToken);
        if (order is null)
            return Result.Failure<WorkOrder>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(order.ObjectId))
            return Result.Failure<WorkOrder>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(order);
    }

    public static async Task<Result<WorkOrder>> GetForBrigadirAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        Guid workOrderId,
        CancellationToken cancellationToken)
    {
        var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (callerBrigadeId is null)
            return Result.Failure<WorkOrder>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        var order = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == workOrderId, cancellationToken);
        if (order is null || order.BrigadeId != callerBrigadeId.Value)
            return Result.Failure<WorkOrder>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        return Result.Success(order);
    }
}
