using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// MASTER §9.4-style read model: GET /objects/budgets — Prorab+, scoped by
// ProrabObjectAssignment same as every other Prorab+ object-scoped read
// (AGENTS.md rule 2: that isolation is manual, not an EF global filter).
// ActualCost reuses ObjectCostCalculator — the exact same MASTER §8.10
// formula GetObjectCostBreakdownQuery uses for a single object — so the two
// endpoints can never drift apart on what "actual cost" means.
public sealed record ListObjectBudgetsQuery : IRequest<Result<IReadOnlyList<ObjectBudgetSummaryDto>>>;

public sealed class ListObjectBudgetsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListObjectBudgetsQuery, Result<IReadOnlyList<ObjectBudgetSummaryDto>>>
{
    public async Task<Result<IReadOnlyList<ObjectBudgetSummaryDto>>> Handle(ListObjectBudgetsQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.ConstructionObjects.AsNoTracking().AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(o => allowedObjectIds.Contains(o.Id));

        var objects = await query.OrderBy(o => o.Name).ToListAsync(cancellationToken);

        var results = new List<ObjectBudgetSummaryDto>(objects.Count);
        foreach (var obj in objects)
        {
            var (materialCost, pieceworkCost, hourlyCost, absenceCost) = await ObjectCostCalculator.ComputeAsync(context, obj.Id, cancellationToken);
            var actualCost = materialCost + pieceworkCost + hourlyCost + absenceCost;
            results.Add(new ObjectBudgetSummaryDto(obj.Id, obj.Name, obj.Budget, actualCost, obj.Budget - actualCost));
        }

        return Result.Success<IReadOnlyList<ObjectBudgetSummaryDto>>(results);
    }
}
