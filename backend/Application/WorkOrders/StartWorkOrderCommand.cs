using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// Same "no dedicated §9.4 endpoint, gated as general Owner/Prorab CRUA"
// caveat as AssignWorkOrderCommand — see that file's comment.
public sealed record StartWorkOrderCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class StartWorkOrderCommandValidator : AbstractValidator<StartWorkOrderCommand>
{
    public StartWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class StartWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser, IRealtimeNotifier notifier)
    : IRequestHandler<StartWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(StartWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
            return Result.Failure<WorkOrderDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return await WorkOrderTransitionHelper.ApplyAsync(
            context, notifier, workOrder, () => workOrder.Start(), currentUser.UserId!.Value, comment: null, cancellationToken);
    }
}
