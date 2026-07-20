using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.WorkOrders;

// MASTER §7.1: New --assign--> Assigned. Not itemized as its own row in
// §9.4's endpoint table (only /submit, /accept|/reject, /log are listed for
// WorkOrder) — flagged in PROGRESS.md as a real gap, since without it a
// WorkOrder could never leave New via the API and /submit could never
// succeed. Decided with the user: add it now, Prorab+ (same role as Create),
// scoped by the same ProrabObjectAssignment isolation as every other
// object-scoped handler.
public sealed record AssignWorkOrderCommand(Guid WorkOrderId, DateOnly AssignedDate) : IRequest<Result<WorkOrderDto>>;

public sealed class AssignWorkOrderCommandValidator : AbstractValidator<AssignWorkOrderCommand>
{
    public AssignWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class AssignWorkOrderCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IWorkOrderRealtimeNotifier notifier)
    : IRequestHandler<AssignWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(AssignWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForProrabAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderDto>(accessResult.Error);

        var order = accessResult.Value;
        var fromStatus = order.Status;

        var result = order.Assign(request.AssignedDate);
        if (result.IsFailure)
            return Result.Failure<WorkOrderDto>(result.Error);

        TaskLogWriter.Append(
            context,
            order.CompanyId,
            TaskLogEntityType.WorkOrder,
            order.Id,
            fromStatus.ToString(),
            order.Status.ToString(),
            currentUser.UserId!.Value);

        await context.SaveChangesAsync(cancellationToken);

        await notifier.NotifyStatusChangedAsync(order.CompanyId, order.Id, fromStatus.ToString(), order.Status.ToString(), cancellationToken);

        return Result.Success(WorkOrderDto.FromEntity(order));
    }
}
