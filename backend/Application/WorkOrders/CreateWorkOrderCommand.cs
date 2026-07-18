using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

public sealed record CreateWorkOrderCommand(
    Guid ObjectId,
    Guid BrigadeId,
    string Title,
    string Unit,
    decimal PlannedQty,
    decimal UnitPrice,
    Guid? EstimateItemId,
    DateOnly? DueDate) : IRequest<Result<WorkOrderDto>>;

public sealed class CreateWorkOrderCommandValidator : AbstractValidator<CreateWorkOrderCommand>
{
    public CreateWorkOrderCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.BrigadeId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.PlannedQty).GreaterThan(0);
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0);
    }
}

public sealed class CreateWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateWorkOrderCommand, Result<WorkOrderDto>>
{
    private const int MaxCodeAttempts = 3;

    public async Task<Result<WorkOrderDto>> Handle(CreateWorkOrderCommand request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<WorkOrderDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        // MASTER §1.2/§11.5 rule 3: creating a work order for an object is
        // just as much "touching" it as reading — same allow-list applies.
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<WorkOrderDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        if (!await context.Brigades.AnyAsync(b => b.Id == request.BrigadeId, cancellationToken))
            return Result.Failure<WorkOrderDto>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        if (request.EstimateItemId is not null && !await context.EstimateItems.AnyAsync(e => e.Id == request.EstimateItemId, cancellationToken))
            return Result.Failure<WorkOrderDto>(new Error("ESTIMATE_ITEM_NOT_FOUND", "Estimate item not found."));

        // Code generation is best-effort MAX+1 (WorkOrderCodeGenerator), not
        // a DB sequence, so two concurrent creates in the same company could
        // race on the same number — the unique (CompanyId, Code) index turns
        // that into a clean DbUpdateException instead of silent corruption.
        // Retry a couple of times with a freshly computed code; a failure on
        // the last attempt propagates as a genuine unexpected error, not a
        // Result — this deep into a collision is not an "expected" failure.
        for (var attempt = 0; attempt < MaxCodeAttempts; attempt++)
        {
            var code = await WorkOrderCodeGenerator.NextCodeAsync(context, currentUser.CompanyId!.Value, cancellationToken);

            var workOrder = WorkOrder.Create(
                currentUser.CompanyId!.Value,
                code,
                request.ObjectId,
                request.BrigadeId,
                request.Title,
                request.Unit,
                request.PlannedQty,
                request.UnitPrice,
                currentUser.UserId!.Value,
                request.EstimateItemId,
                request.DueDate);

            context.WorkOrders.Add(workOrder);

            try
            {
                await context.SaveChangesAsync(cancellationToken);
                return Result.Success(WorkOrderDto.FromEntity(workOrder));
            }
            catch (DbUpdateException) when (attempt < MaxCodeAttempts - 1)
            {
                context.WorkOrders.Remove(workOrder);
            }
        }

        throw new InvalidOperationException($"Could not generate a unique work order code after {MaxCodeAttempts} attempts.");
    }
}
