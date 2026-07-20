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
        RuleFor(x => x.PlannedQty).GreaterThanOrEqualTo(0);
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0);
    }
}

public sealed class CreateWorkOrderCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateWorkOrderCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(CreateWorkOrderCommand request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<WorkOrderDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        // A WorkOrder always references an existing object — same isolation
        // guard as CreateEstimateItemCommand (Phase 1 Step 4). Unlike creating
        // a brand-new ConstructionObject, there's an existing row to scope
        // against here.
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<WorkOrderDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        if (!await context.Brigades.AnyAsync(b => b.Id == request.BrigadeId, cancellationToken))
            return Result.Failure<WorkOrderDto>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        if (request.EstimateItemId is not null && !await context.EstimateItems.AnyAsync(e => e.Id == request.EstimateItemId, cancellationToken))
            return Result.Failure<WorkOrderDto>(new Error("ESTIMATE_ITEM_NOT_FOUND", "Estimate item not found."));

        var company = await context.Companies.FirstAsync(cancellationToken);
        var code = company.ReserveNextCode();

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
        }
        catch (DbUpdateConcurrencyException)
        {
            // Two concurrent creates raced on Company.NextCodeNumber — xmin
            // catches it (Company now has a row-version) instead of letting
            // the (CompanyId, Code) unique-index violation bubble up raw.
            return Result.Failure<WorkOrderDto>(new Error("CONCURRENCY_CONFLICT", "Concurrent update — retry."));
        }

        return Result.Success(WorkOrderDto.FromEntity(workOrder));
    }
}
