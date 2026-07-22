using Application.Common.Interfaces;
using Application.IndividualTasks;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrderPayoutShares;

// MASTER §12: Owner/Accountant read all, Prorab read own assigned objects,
// Brigadir read own brigade — same "own" isolation as GetWorkOrderLogQuery
// (Phase 2 Step 3), not literally named in §9.4 but implied by "R" on every
// role's row for this entity.
public sealed record ListWorkOrderPayoutSharesQuery(Guid WorkOrderId) : IRequest<Result<IReadOnlyList<WorkOrderPayoutShareDto>>>;

public sealed class ListWorkOrderPayoutSharesQueryValidator : AbstractValidator<ListWorkOrderPayoutSharesQuery>
{
    public ListWorkOrderPayoutSharesQueryValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class ListWorkOrderPayoutSharesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListWorkOrderPayoutSharesQuery, Result<IReadOnlyList<WorkOrderPayoutShareDto>>>
{
    public async Task<Result<IReadOnlyList<WorkOrderPayoutShareDto>>> Handle(
        ListWorkOrderPayoutSharesQuery request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        if (currentUser.Role == Role.Brigadir)
        {
            var ownBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
            if (ownBrigadeId != workOrder.BrigadeId)
                return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
                return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));
        }

        var shares = await context.WorkOrderPayoutShares
            .Where(s => s.WorkOrderId == workOrder.Id)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<WorkOrderPayoutShareDto>>(shares.Select(WorkOrderPayoutShareDto.FromEntity).ToList());
    }
}
