using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §7.1: "OnReview -> Accepted/Rejected — только Prorab, назначенный
// на этот объект (§1.2), или Owner."
public sealed record AcceptWorkOrderCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class AcceptWorkOrderCommandValidator : AbstractValidator<AcceptWorkOrderCommand>
{
    public AcceptWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class AcceptWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser, IRealtimeNotifier notifier)
    : IRequestHandler<AcceptWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(AcceptWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
            return Result.Failure<WorkOrderDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var completedDate = DateOnly.FromDateTime(DateTime.UtcNow);

        return await WorkOrderTransitionHelper.ApplyAsync(
            context, notifier, workOrder, () => workOrder.Accept(completedDate), currentUser.UserId!.Value, comment: null, cancellationToken);
    }
}
