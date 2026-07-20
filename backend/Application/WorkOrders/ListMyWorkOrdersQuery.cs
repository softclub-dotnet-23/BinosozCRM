using Application.Common.Interfaces;
using Application.Common.Models;
using Application.IndividualTasks;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §9.4: GET /work-orders/mine — Brigadir, own brigade only. The
// Brigadir half of "GET,POST /work-orders — Prorab+ / Brigadir(own, read)"
// that ListWorkOrdersQuery's own comment flagged as not yet built — closes
// that gap. Mirrors ListIndividualTasksQuery's shape exactly (same
// BrigadeAccess lookup, same pagination).
public sealed record ListMyWorkOrdersQuery(int Page, int PageSize) : IRequest<Result<PagedResult<WorkOrderDto>>>;

public sealed class ListMyWorkOrdersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMyWorkOrdersQuery, Result<PagedResult<WorkOrderDto>>>
{
    public async Task<Result<PagedResult<WorkOrderDto>>> Handle(ListMyWorkOrdersQuery request, CancellationToken cancellationToken)
    {
        var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (callerBrigadeId is null)
            return Result.Failure<PagedResult<WorkOrderDto>>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        var query = context.WorkOrders
            .Where(w => w.BrigadeId == callerBrigadeId.Value)
            .OrderBy(w => w.Code);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(WorkOrderDto.FromEntity).ToList();

        return Result.Success(new PagedResult<WorkOrderDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
