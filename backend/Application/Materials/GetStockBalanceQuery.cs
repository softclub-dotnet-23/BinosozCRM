using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4-style read model: GET /objects/{id}/stock — Prorab+, scoped by
// ProrabObjectAssignment same as GetObjectCostBreakdownQuery. Materials have
// no catalog (MASTER: identified by the free-text (MaterialName, Unit) pair
// on MaterialDelivery/MaterialConsumptionReport), so balance is computed on
// the fly rather than stored — same "denormalizing would drift" reasoning as
// the cost breakdown.
public sealed record GetStockBalanceQuery(Guid ObjectId) : IRequest<Result<IReadOnlyList<StockBalanceDto>>>;

public sealed class GetStockBalanceQueryValidator : AbstractValidator<GetStockBalanceQuery>
{
    public GetStockBalanceQueryValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
    }
}

public sealed class GetStockBalanceQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetStockBalanceQuery, Result<IReadOnlyList<StockBalanceDto>>>
{
    public async Task<Result<IReadOnlyList<StockBalanceDto>>> Handle(GetStockBalanceQuery request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<IReadOnlyList<StockBalanceDto>>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<IReadOnlyList<StockBalanceDto>>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var delivered = await context.MaterialDeliveries.AsNoTracking()
            .Where(d => d.ObjectId == request.ObjectId)
            .GroupBy(d => new { d.MaterialName, d.Unit })
            .Select(g => new { g.Key.MaterialName, g.Key.Unit, Total = g.Sum(d => d.Qty) })
            .ToListAsync(cancellationToken);

        var consumed = await context.MaterialConsumptionReports.AsNoTracking()
            .Where(c => c.ObjectId == request.ObjectId)
            .GroupBy(c => new { c.MaterialName, c.Unit })
            .Select(g => new { g.Key.MaterialName, g.Key.Unit, Total = g.Sum(c => c.QtyUsed) })
            .ToListAsync(cancellationToken);

        var balances = new Dictionary<(string MaterialName, string Unit), (decimal Delivered, decimal Consumed)>();
        foreach (var d in delivered)
            balances[(d.MaterialName, d.Unit)] = (d.Total, 0m);
        foreach (var c in consumed)
        {
            var key = (c.MaterialName, c.Unit);
            var delivered0 = balances.TryGetValue(key, out var existing) ? existing.Delivered : 0m;
            balances[key] = (delivered0, c.Total);
        }

        var items = balances
            .Select(kv => new StockBalanceDto(kv.Key.MaterialName, kv.Key.Unit, kv.Value.Delivered, kv.Value.Consumed, kv.Value.Delivered - kv.Value.Consumed))
            .OrderBy(x => x.MaterialName)
            .ThenBy(x => x.Unit)
            .ToList();

        return Result.Success<IReadOnlyList<StockBalanceDto>>(items);
    }
}
