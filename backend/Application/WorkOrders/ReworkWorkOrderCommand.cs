using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.WorkOrders;

// MASTER §7.1: Rejected --доработка--> InProgress. Punch-list closeout:
// WorkOrder.Rework() existed in Domain since Phase 2 but was never wired to
// a handler. Brigadir, own brigade only — the crew doing the rework is the
// one moving it back into InProgress, same ownership as /start and /submit.
public sealed record ReworkWorkOrderCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class ReworkWorkOrderCommandValidator : AbstractValidator<ReworkWorkOrderCommand>
{
    public ReworkWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class ReworkWorkOrderCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IWorkOrderRealtimeNotifier notifier)
    : IRequestHandler<ReworkWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(ReworkWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForBrigadirAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderDto>(accessResult.Error);

        var order = accessResult.Value;
        var fromStatus = order.Status;

        var result = order.Rework();
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
