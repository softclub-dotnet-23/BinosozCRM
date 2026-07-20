using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §9.4: GET /work-orders/{id}/log — Prorab+, Brigadir(own). Isolation
// branches on the caller's role since the two sides use different scoping
// rules (ProrabObjectAssignment vs. own BrigadeId) — same split as every
// other WorkOrder handler in this file.
public sealed record GetWorkOrderLogQuery(Guid WorkOrderId) : IRequest<Result<List<TaskLogDto>>>;

public sealed class GetWorkOrderLogQueryValidator : AbstractValidator<GetWorkOrderLogQuery>
{
    public GetWorkOrderLogQueryValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class GetWorkOrderLogQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetWorkOrderLogQuery, Result<List<TaskLogDto>>>
{
    public async Task<Result<List<TaskLogDto>>> Handle(GetWorkOrderLogQuery request, CancellationToken cancellationToken)
    {
        var accessResult = currentUser.Role == Role.Brigadir
            ? await WorkOrderAccess.GetForBrigadirAsync(context, currentUser, request.WorkOrderId, cancellationToken)
            : await WorkOrderAccess.GetForProrabAsync(context, currentUser, request.WorkOrderId, cancellationToken);

        if (accessResult.IsFailure)
            return Result.Failure<List<TaskLogDto>>(accessResult.Error);

        var logs = await context.TaskLogs
            .Where(l => l.EntityType == TaskLogEntityType.WorkOrder && l.EntityId == request.WorkOrderId)
            .OrderBy(l => l.ChangedAt)
            .ToListAsync(cancellationToken);

        return Result.Success(logs.Select(TaskLogDto.FromEntity).ToList());
    }
}
