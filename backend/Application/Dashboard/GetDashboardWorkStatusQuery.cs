using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Dashboard;

// MASTER §9.4/§8.6: GET /dashboard/work-status — Prorab+. "Один handler,
// агрегирующий WorkOrder.Status и IndividualTask.Status вместе, фильтр по
// объекту/бригаде. Счётчики по статусам + просроченные." Read-only —
// §8.6 is explicit that actions live on the entity's own card, not here.
//
// Isolation: WorkOrder counts respect ProrabObjectAssignment (§1.2's
// established isolation axis for this role) — an explicit ObjectId filter
// is checked against it (PRORAB_NOT_ASSIGNED_TO_OBJECT if not allowed).
// IndividualTask counts are company-wide for Prorab+ — this codebase has
// no established per-object isolation rule for IndividualTask at all (it's
// scoped to the Brigadir's own brigade, not to Prorab's objects, anywhere
// else it appears), and an aggregate count carries far less exposure risk
// than a data-access endpoint would, so nothing invented here beyond the
// optional BrigadeId filter applying to both entities directly.
public sealed record GetDashboardWorkStatusQuery(Guid? ObjectId, Guid? BrigadeId) : IRequest<Result<DashboardWorkStatusDto>>;

public sealed class GetDashboardWorkStatusQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetDashboardWorkStatusQuery, Result<DashboardWorkStatusDto>>
{
    public async Task<Result<DashboardWorkStatusDto>> Handle(GetDashboardWorkStatusQuery request, CancellationToken cancellationToken)
    {
        if (request.ObjectId is not null)
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId.Value))
                return Result.Failure<DashboardWorkStatusDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));
        }

        var workOrders = context.WorkOrders.AsQueryable();
        if (request.ObjectId is not null)
            workOrders = workOrders.Where(w => w.ObjectId == request.ObjectId.Value);
        if (request.BrigadeId is not null)
            workOrders = workOrders.Where(w => w.BrigadeId == request.BrigadeId.Value);

        var individualTasks = context.IndividualTasks.AsQueryable();
        if (request.ObjectId is not null)
            individualTasks = individualTasks.Where(t => t.WorkOrderId != null && context.WorkOrders.Any(w => w.Id == t.WorkOrderId && w.ObjectId == request.ObjectId.Value));
        if (request.BrigadeId is not null)
            individualTasks = individualTasks.Where(t => t.BrigadeId == request.BrigadeId.Value);

        var workOrderCounts = await workOrders
            .GroupBy(w => w.Status)
            .Select(g => new StatusCountDto(g.Key.ToString(), g.Count()))
            .ToListAsync(cancellationToken);

        var individualTaskCounts = await individualTasks
            .GroupBy(t => t.Status)
            .Select(g => new StatusCountDto(g.Key.ToString(), g.Count()))
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var now = DateTimeOffset.UtcNow;

        var overdueWorkOrders = await workOrders.CountAsync(
            w => w.DueDate != null && w.DueDate < today && w.Status != WorkOrderStatus.Accepted && w.Status != WorkOrderStatus.Closed,
            cancellationToken);

        var overdueIndividualTasks = await individualTasks.CountAsync(
            t => t.DueAt != null && t.DueAt < now && t.Status != IndividualTaskStatus.Done,
            cancellationToken);

        return Result.Success(new DashboardWorkStatusDto(workOrderCounts, individualTaskCounts, overdueWorkOrders, overdueIndividualTasks));
    }
}
