using Application.Common.Interfaces;
using Application.IndividualTasks;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

public sealed record GetWorkOrderQuery(Guid Id) : IRequest<Result<WorkOrderDto>>;

public sealed class GetWorkOrderQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetWorkOrderQuery, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(GetWorkOrderQuery request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        if (currentUser.Role == Role.Brigadir)
        {
            var ownBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
            if (ownBrigadeId != workOrder.BrigadeId)
                return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
                return Result.Failure<WorkOrderDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));
        }

        return Result.Success(WorkOrderDto.FromEntity(workOrder));
    }
}
