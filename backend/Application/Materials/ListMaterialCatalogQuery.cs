using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// GET /materials/catalog — Prorab+, scoped by ProrabObjectAssignment same as
// every other Prorab+ object-scoped read (AGENTS.md rule 2). There is no
// materials catalog table by design (materials are identified by the
// free-text (MaterialName, Unit) pair on MaterialDelivery) — this is a
// distinct-pairs aggregate over MaterialDelivery, computed on the fly, same
// spirit as GetStockBalanceQuery.
public sealed record ListMaterialCatalogQuery : IRequest<Result<IReadOnlyList<MaterialCatalogEntryDto>>>;

public sealed class ListMaterialCatalogQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMaterialCatalogQuery, Result<IReadOnlyList<MaterialCatalogEntryDto>>>
{
    public async Task<Result<IReadOnlyList<MaterialCatalogEntryDto>>> Handle(ListMaterialCatalogQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.MaterialDeliveries.AsNoTracking().AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(d => allowedObjectIds.Contains(d.ObjectId));

        var rows = await query
            .Select(d => new { d.MaterialName, d.Unit, d.UnitCost, d.DeliveredAt })
            .ToListAsync(cancellationToken);

        var items = rows
            .GroupBy(d => new { d.MaterialName, d.Unit })
            .Select(g => new MaterialCatalogEntryDto(
                g.Key.MaterialName,
                g.Key.Unit,
                g.OrderByDescending(d => d.DeliveredAt).First().UnitCost,
                g.Count()))
            .OrderBy(x => x.MaterialName)
            .ThenBy(x => x.Unit)
            .ToList();

        return Result.Success<IReadOnlyList<MaterialCatalogEntryDto>>(items);
    }
}
