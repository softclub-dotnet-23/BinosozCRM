using Application.Common.Interfaces;
using Application.MaterialRequests;
using Application.Objects;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialDeliveries;

// MASTER §9.4: "GET,POST /material-deliveries Prorab+" — Prorab+ both
// creates and reads here, unlike the other two material entities (no
// Brigadir role at all — deliveries are logged on the procurement side).
// §7.3: linking a request auto-transitions it (Approved/Ordered ->
// PartiallyDelivered -> Delivered) via MaterialRequest.RecordDelivery(),
// already written in Phase 0.
public sealed record CreateMaterialDeliveryCommand(
    Guid ObjectId,
    Guid? MaterialRequestId,
    string MaterialName,
    string Unit,
    decimal Qty,
    decimal UnitCost,
    string? SupplierName) : IRequest<Result<CreateMaterialDeliveryResultDto>>;

public sealed record CreateMaterialDeliveryResultDto(MaterialDeliveryDto Delivery, MaterialRequestDto? UpdatedRequest);

public sealed class CreateMaterialDeliveryCommandValidator : AbstractValidator<CreateMaterialDeliveryCommand>
{
    public CreateMaterialDeliveryCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.MaterialName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Qty).GreaterThan(0);
        RuleFor(x => x.UnitCost).GreaterThanOrEqualTo(0);
        RuleFor(x => x.SupplierName).MaximumLength(200);
    }
}

public sealed class CreateMaterialDeliveryCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateMaterialDeliveryCommand, Result<CreateMaterialDeliveryResultDto>>
{
    public async Task<Result<CreateMaterialDeliveryResultDto>> Handle(CreateMaterialDeliveryCommand request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<CreateMaterialDeliveryResultDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<CreateMaterialDeliveryResultDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        MaterialRequest? materialRequest = null;
        if (request.MaterialRequestId is not null)
        {
            materialRequest = await context.MaterialRequests.FirstOrDefaultAsync(r => r.Id == request.MaterialRequestId, cancellationToken);
            if (materialRequest is null)
                return Result.Failure<CreateMaterialDeliveryResultDto>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

            // A delivery can't be logged against a request for a different object.
            if (materialRequest.ObjectId != request.ObjectId)
                return Result.Failure<CreateMaterialDeliveryResultDto>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

            var recordResult = materialRequest.RecordDelivery(request.Qty, DateTimeOffset.UtcNow);
            if (recordResult.IsFailure)
                return Result.Failure<CreateMaterialDeliveryResultDto>(recordResult.Error);
        }

        var delivery = MaterialDelivery.Create(
            currentUser.CompanyId!.Value, request.ObjectId, request.MaterialName, request.Unit,
            request.Qty, request.UnitCost, DateTimeOffset.UtcNow, request.MaterialRequestId, request.SupplierName);

        context.MaterialDeliveries.Add(delivery);
        await context.SaveChangesAsync(cancellationToken);

        var updatedRequestDto = materialRequest is null ? null : MaterialRequestDto.FromEntity(materialRequest);
        return Result.Success(new CreateMaterialDeliveryResultDto(MaterialDeliveryDto.FromEntity(delivery), updatedRequestDto));
    }
}
