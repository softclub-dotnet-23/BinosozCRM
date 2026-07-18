using Application.Common;
using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §9.4: "GET /work-orders/{id}/log Prorab+, Brigadir(own)." Same
// isolation as GetWorkOrderQuery — reading the log is just as much
// "touching" the work order as reading it directly.
public sealed record GetWorkOrderLogQuery(Guid WorkOrderId, int Page, int PageSize) : IRequest<Result<PagedResult<TaskLogDto>>>;

public sealed class GetWorkOrderLogQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetWorkOrderLogQuery, Result<PagedResult<TaskLogDto>>>
{
    public async Task<Result<PagedResult<TaskLogDto>>> Handle(GetWorkOrderLogQuery request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<PagedResult<TaskLogDto>>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        if (currentUser.Role == Role.Brigadir)
        {
            var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
            if (ownBrigadeId != workOrder.BrigadeId)
                return Result.Failure<PagedResult<TaskLogDto>>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
                return Result.Failure<PagedResult<TaskLogDto>>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));
        }

        var query = context.TaskLogs
            .Where(l => l.EntityType == TaskLogEntityType.WorkOrder && l.EntityId == workOrder.Id)
            .OrderBy(l => l.ChangedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(TaskLogDto.FromEntity).ToList();

        return Result.Success(new PagedResult<TaskLogDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
