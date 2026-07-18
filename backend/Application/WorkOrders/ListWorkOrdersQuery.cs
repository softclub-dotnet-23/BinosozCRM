using Application.Common;
using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

public sealed record ListWorkOrdersQuery(int Page, int PageSize) : IRequest<Result<PagedResult<WorkOrderDto>>>;

public sealed class ListWorkOrdersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListWorkOrdersQuery, Result<PagedResult<WorkOrderDto>>>
{
    public async Task<Result<PagedResult<WorkOrderDto>>> Handle(ListWorkOrdersQuery request, CancellationToken cancellationToken)
    {
        var query = context.WorkOrders.AsQueryable();

        if (currentUser.Role == Role.Brigadir)
        {
            var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
            query = query.Where(w => w.BrigadeId == ownBrigadeId);
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null)
                query = query.Where(w => allowedObjectIds.Contains(w.ObjectId));
        }

        query = query.OrderByDescending(w => w.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(WorkOrderDto.FromEntity).ToList();

        return Result.Success(new PagedResult<WorkOrderDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
