using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §7.1: same actor rule as Accept — "Reject требует причину →
// TaskLog.Comment".
public sealed record RejectWorkOrderCommand(Guid WorkOrderId, string Reason) : IRequest<Result<WorkOrderDto>>;

public sealed class RejectWorkOrderCommandValidator : AbstractValidator<RejectWorkOrderCommand>
{
    public RejectWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
    }
}

public sealed class RejectWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<RejectWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(RejectWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
            return Result.Failure<WorkOrderDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return await WorkOrderTransitionHelper.ApplyAsync(
            context, workOrder, () => workOrder.Reject(), currentUser.UserId!.Value, request.Reason, cancellationToken);
    }
}
