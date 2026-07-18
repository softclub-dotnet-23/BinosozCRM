using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §9.4: GET,POST /work-orders — Prorab+ / Brigadir(own, read). Only
// the Prorab+ half is built here — Brigadir has no authenticated path
// anywhere in this codebase yet (the bot is Brigadir's interface, and bot
// work is deferred per the user's 2026-07-18 decision).
public sealed record ListWorkOrdersQuery(int Page, int PageSize) : IRequest<Result<PagedResult<WorkOrderDto>>>;

public sealed class ListWorkOrdersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListWorkOrdersQuery, Result<PagedResult<WorkOrderDto>>>
{
    public async Task<Result<PagedResult<WorkOrderDto>>> Handle(ListWorkOrdersQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.WorkOrders.AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(w => allowedObjectIds.Contains(w.ObjectId));

        query = query.OrderBy(w => w.Code);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(WorkOrderDto.FromEntity).ToList();

        return Result.Success(new PagedResult<WorkOrderDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
