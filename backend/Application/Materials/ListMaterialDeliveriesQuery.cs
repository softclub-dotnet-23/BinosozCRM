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

        var query = context.MaterialDeliveries.AsNoTracking().AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(d => allowedObjectIds.Contains(d.ObjectId));

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await (
                from materialDelivery in query
                join constructionObject in context.ConstructionObjects.AsNoTracking()
                    on materialDelivery.ObjectId equals constructionObject.Id
                orderby materialDelivery.DeliveredAt descending
                select new MaterialDeliveryDto(
                    materialDelivery.Id,
                    materialDelivery.ObjectId,
                    constructionObject.Name,
                    materialDelivery.MaterialRequestId,
                    materialDelivery.DocumentId,
                    materialDelivery.MaterialName,
                    materialDelivery.Unit,
                    materialDelivery.Qty,
                    materialDelivery.UnitCost,
                    materialDelivery.SupplierName,
                    materialDelivery.DeliveredAt))
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedResult<MaterialDeliveryDto>(items, request.Page, request.PageSize, totalCount));
    }
}
