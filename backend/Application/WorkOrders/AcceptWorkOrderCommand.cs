using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.WorkOrders;

// MASTER §9.4/§7.1: POST /work-orders/{id}/accept — Prorab+ (Prorab
// assigned to the order's object, or Owner).
public sealed record AcceptWorkOrderCommand(Guid WorkOrderId, DateOnly CompletedDate) : IRequest<Result<WorkOrderDto>>;

public sealed class AcceptWorkOrderCommandValidator : AbstractValidator<AcceptWorkOrderCommand>
{
    public AcceptWorkOrderCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class AcceptWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<AcceptWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(AcceptWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForProrabAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderDto>(accessResult.Error);

        var order = accessResult.Value;
        var fromStatus = order.Status;

        var result = order.Accept(request.CompletedDate);
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

        return Result.Success(WorkOrderDto.FromEntity(order));
    }
}
