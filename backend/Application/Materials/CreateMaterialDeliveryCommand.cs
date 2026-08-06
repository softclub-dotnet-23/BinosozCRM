using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4/§8.2/§7.3: POST /material-deliveries — Prorab+. The
// auto-transition is genuinely automatic, not a separate action: creating
// a delivery with a MaterialRequestId immediately calls
// MaterialRequest.RecordDelivery, which does the "0 < Σ Qty < Request.Qty
// -> PartiallyDelivered, Σ Qty >= Request.Qty -> Delivered" math itself
// (§8.2's ПРОБЕЛ №6 formula) — "переход автоматический, не ручной, иначе
// прораб забудет." A delivery with no MaterialRequestId is a valid,
// unplanned purchase — "ни на какую заявку не влияет" — so it's simply
// recorded with nothing else touched.
public sealed record CreateMaterialDeliveryCommand(
    Guid ObjectId,
    Guid? MaterialRequestId,
    string MaterialName,
    string Unit,
    decimal Qty,
    decimal UnitCost,
    string? SupplierName) : IRequest<Result<MaterialDeliveryDto>>;

public sealed class CreateMaterialDeliveryCommandValidator : AbstractValidator<CreateMaterialDeliveryCommand>
{
    public CreateMaterialDeliveryCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.MaterialName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Qty).GreaterThan(0);
        RuleFor(x => x.UnitCost).GreaterThanOrEqualTo(0);
    }
}

public sealed class CreateMaterialDeliveryCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateMaterialDeliveryCommand, Result<MaterialDeliveryDto>>
{
    public async Task<Result<MaterialDeliveryDto>> Handle(CreateMaterialDeliveryCommand request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<MaterialDeliveryDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        MaterialRequest? materialRequest = null;
        if (request.MaterialRequestId is not null)
        {
            var accessResult = await MaterialRequestAccess.GetForProrabAsync(context, currentUser, request.MaterialRequestId.Value, cancellationToken);
            if (accessResult.IsFailure)
                return Result.Failure<MaterialDeliveryDto>(accessResult.Error);

            materialRequest = accessResult.Value;
        }

        var deliveredAt = DateTimeOffset.UtcNow;

        var delivery = MaterialDelivery.Create(
            currentUser.CompanyId!.Value,
            request.ObjectId,
            request.MaterialName,
            request.Unit,
            request.Qty,
            request.UnitCost,
            deliveredAt,
            request.MaterialRequestId,
            request.SupplierName);

        if (materialRequest is not null)
        {
            var recordResult = materialRequest.RecordDelivery(request.Qty, deliveredAt);
            if (recordResult.IsFailure)
                return Result.Failure<MaterialDeliveryDto>(recordResult.Error);
        }

        context.MaterialDeliveries.Add(delivery);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(MaterialDeliveryDto.FromEntity(delivery));
    }
}
