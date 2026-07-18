using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.WorkOrders;

// MASTER §9.4/§7.1: POST /work-orders/{id}/reject — Prorab+, reason
// mandatory ("reject требует причину"). FluentValidation's NotEmpty on
// Reason already yields 400 VALIDATION_FAILED for a missing reason — no
// separate domain error code needed for that; the reason itself becomes
// TaskLog.Comment, satisfying §5.15's "Reject требует причину →
// TaskLog.Comment".
public sealed record RejectWorkOrderCommand(Guid WorkOrderId, string Reason) : IRequest<Result<WorkOrderDto>>;

public sealed class RejectWorkOrderCommandValidator : AbstractValidator<RejectWorkOrderCommand>
{
    public RejectWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(2000);
    }
}

public sealed class RejectWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<RejectWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(RejectWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForProrabAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderDto>(accessResult.Error);

        var order = accessResult.Value;
        var fromStatus = order.Status;

        var result = order.Reject();
        if (result.IsFailure)
            return Result.Failure<WorkOrderDto>(result.Error);

        TaskLogWriter.Append(
            context,
            order.CompanyId,
            TaskLogEntityType.WorkOrder,
            order.Id,
            fromStatus.ToString(),
            order.Status.ToString(),
            currentUser.UserId!.Value,
            request.Reason);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(WorkOrderDto.FromEntity(order));
    }
}
