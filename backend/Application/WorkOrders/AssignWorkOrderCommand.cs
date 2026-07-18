using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §9.4 doesn't list a dedicated endpoint for this transition (only
// /submit, /accept, /reject are named) — flagged in the step report. Gated
// Owner/Prorab here as the rest of WorkOrder's general "U" in §12's CRUA,
// since §7.1 doesn't call out a specific actor for New -> Assigned the way
// it does for submit/accept/reject.
public sealed record AssignWorkOrderCommand(Guid WorkOrderId, DateOnly AssignedDate) : IRequest<Result<WorkOrderDto>>;

public sealed class AssignWorkOrderCommandValidator : AbstractValidator<AssignWorkOrderCommand>
{
    public AssignWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
        RuleFor(x => x.AssignedDate).NotEmpty();
    }
}

public sealed class AssignWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser, IRealtimeNotifier notifier)
    : IRequestHandler<AssignWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(AssignWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
            return Result.Failure<WorkOrderDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return await WorkOrderTransitionHelper.ApplyAsync(
            context, notifier, workOrder, () => workOrder.Assign(request.AssignedDate), currentUser.UserId!.Value, comment: null, cancellationToken);
    }
}
