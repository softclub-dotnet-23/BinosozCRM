using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.WorkOrders;

// MASTER §7.1: Accepted --close--> Closed, "вручную Prorab" — the manual
// half. The automatic half ("авто после PayrollEntry.Paid за период") lives
// in WorkOrderAutoCloser, invoked from PayPayrollEntryCommand once a period
// is fully paid out; this command is for the Prorab who wants to close an
// order without waiting for that (e.g. an Hourly-brigade order, which has
// no WorkOrderPayoutShare rows for the auto-closer to key off at all).
public sealed record CloseWorkOrderCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class CloseWorkOrderCommandValidator : AbstractValidator<CloseWorkOrderCommand>
{
    public CloseWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class CloseWorkOrderCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IWorkOrderRealtimeNotifier notifier)
    : IRequestHandler<CloseWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(CloseWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForProrabAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderDto>(accessResult.Error);

        var order = accessResult.Value;
        var fromStatus = order.Status;

        var result = order.Close();
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
