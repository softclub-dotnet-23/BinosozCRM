using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4: GET /material-deliveries — Prorab+, scoped by
// ProrabObjectAssignment on ObjectId, same pattern as every other Prorab+
// list in this codebase.
public sealed record ListMaterialDeliveriesQuery(int Page, int PageSize) : IRequest<Result<PagedResult<MaterialDeliveryDto>>>;

public sealed class ListMaterialDeliveriesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMaterialDeliveriesQuery, Result<PagedResult<MaterialDeliveryDto>>>
{
    public async Task<Result<PagedResult<MaterialDeliveryDto>>> Handle(ListMaterialDeliveriesQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.MaterialDeliveries.AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(d => allowedObjectIds.Contains(d.ObjectId));

        query = query.OrderByDescending(d => d.DeliveredAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MaterialDeliveryDto.FromEntity).ToList();

        return Result.Success(new PagedResult<MaterialDeliveryDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
