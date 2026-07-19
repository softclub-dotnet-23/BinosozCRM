using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.WorkOrders;

// MASTER §7.1: Assigned --start--> InProgress. Same gap as Assign — not in
// §9.4's literal endpoint table, added alongside it per the user's decision
// so the lifecycle is reachable end-to-end. Brigadir, own brigade only
// (mirrors IndividualTask's Start/Complete — the crew doing the work is the
// one marking it started).
public sealed record StartWorkOrderCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class StartWorkOrderCommandValidator : AbstractValidator<StartWorkOrderCommand>
{
    public StartWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class StartWorkOrderCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IWorkOrderRealtimeNotifier notifier)
    : IRequestHandler<StartWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(StartWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForBrigadirAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderDto>(accessResult.Error);

        var order = accessResult.Value;
        var fromStatus = order.Status;

        var result = order.Start();
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
