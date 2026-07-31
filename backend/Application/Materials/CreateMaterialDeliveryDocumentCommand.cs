using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// Frontend-integration gap: the UI's "receipt" is one document with several
// material lines; MaterialDelivery is one line per row (§8.2 doesn't model a
// document concept at all). This bulk path creates every line in one
// SaveChangesAsync, sharing one generated DocumentId — no MaterialRequestId
// linkage here (a document's several lines could each belong to a different
// original request, genuinely out of scope for this fix; the pre-existing
// single-item CreateMaterialDeliveryCommand still covers the request-linked
// case one line at a time).
public sealed record MaterialDeliveryDocumentLineInput(string MaterialName, string Unit, decimal Qty, decimal UnitCost);

public sealed record CreateMaterialDeliveryDocumentCommand(
    Guid ObjectId,
    string? SupplierName,
    IReadOnlyList<MaterialDeliveryDocumentLineInput> Items) : IRequest<Result<MaterialDeliveryDocumentDto>>;

public sealed record MaterialDeliveryDocumentDto(
    Guid DocumentId,
    Guid ObjectId,
    string? SupplierName,
    DateTimeOffset DeliveredAt,
    IReadOnlyList<MaterialDeliveryDto> Lines);

public sealed class CreateMaterialDeliveryDocumentCommandValidator : AbstractValidator<CreateMaterialDeliveryDocumentCommand>
{
    public CreateMaterialDeliveryDocumentCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MaterialName).NotEmpty().MaximumLength(200);
            item.RuleFor(i => i.Unit).NotEmpty().MaximumLength(20);
            item.RuleFor(i => i.Qty).GreaterThan(0);
            item.RuleFor(i => i.UnitCost).GreaterThanOrEqualTo(0);
        });
    }
}

public sealed class CreateMaterialDeliveryDocumentCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateMaterialDeliveryDocumentCommand, Result<MaterialDeliveryDocumentDto>>
{
    public async Task<Result<MaterialDeliveryDocumentDto>> Handle(CreateMaterialDeliveryDocumentCommand request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<MaterialDeliveryDocumentDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var documentId = Guid.NewGuid();
        var deliveredAt = DateTimeOffset.UtcNow;

        var deliveries = request.Items.Select(item => MaterialDelivery.Create(
            currentUser.CompanyId!.Value,
            request.ObjectId,
            item.MaterialName,
            item.Unit,
            item.Qty,
            item.UnitCost,
            deliveredAt,
            materialRequestId: null,
            supplierName: request.SupplierName,
            documentId: documentId)).ToList();

        context.MaterialDeliveries.AddRange(deliveries);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(new MaterialDeliveryDocumentDto(
            documentId,
            request.ObjectId,
            request.SupplierName,
            deliveredAt,
            deliveries.Select(MaterialDeliveryDto.FromEntity).ToList()));
    }
}
