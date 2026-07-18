using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §7.1: "Rejected -> InProgress — доработка." No explicit actor is
// named for this arrow (unlike submit/accept/reject) — gated to Brigadir
// (own brigade) as the natural pairing with submit, since they're the one
// who'd redo the work and resubmit. Flagged as an interpretation.
public sealed record ReworkWorkOrderCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class ReworkWorkOrderCommandValidator : AbstractValidator<ReworkWorkOrderCommand>
{
    public ReworkWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class ReworkWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ReworkWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(ReworkWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != workOrder.BrigadeId)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        return await WorkOrderTransitionHelper.ApplyAsync(
            context, workOrder, () => workOrder.Rework(), currentUser.UserId!.Value, comment: null, cancellationToken);
    }
}
