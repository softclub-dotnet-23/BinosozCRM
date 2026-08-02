using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

// GET /brigades/assignments — Prorab+, scoped by ProrabObjectAssignment same
// as every other Prorab+ object-scoped read (AGENTS.md rule 2). WorkOrder is
// the assignment: BrigadeId+ObjectId+AssignedDate+DueDate+Status, Amount
// computed as PlannedQty*UnitPrice (WorkOrder has no stored total, same as
// every other place this codebase derives it rather than storing it).
public sealed record ListBrigadeAssignmentsQuery(Guid? BrigadeId) : IRequest<Result<IReadOnlyList<BrigadeAssignmentDto>>>;

public sealed class ListBrigadeAssignmentsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListBrigadeAssignmentsQuery, Result<IReadOnlyList<BrigadeAssignmentDto>>>
{
    public async Task<Result<IReadOnlyList<BrigadeAssignmentDto>>> Handle(ListBrigadeAssignmentsQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.WorkOrders.AsNoTracking().AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(w => allowedObjectIds.Contains(w.ObjectId));
        if (request.BrigadeId is not null)
            query = query.Where(w => w.BrigadeId == request.BrigadeId.Value);

        var items = await (
            from workOrder in query
            join brigade in context.Brigades.AsNoTracking() on workOrder.BrigadeId equals brigade.Id
            join constructionObject in context.ConstructionObjects.AsNoTracking() on workOrder.ObjectId equals constructionObject.Id
            orderby workOrder.AssignedDate descending
            select new BrigadeAssignmentDto(
                workOrder.BrigadeId,
                brigade.Name,
                workOrder.ObjectId,
                constructionObject.Name,
                workOrder.Title,
                workOrder.PlannedQty * workOrder.UnitPrice,
                workOrder.AssignedDate,
                workOrder.DueDate,
                workOrder.Status))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<BrigadeAssignmentDto>>(items);
    }
}
