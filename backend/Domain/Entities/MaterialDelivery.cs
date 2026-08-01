using Domain.Common;

namespace Domain.Entities;

public sealed class MaterialDelivery : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid ObjectId { get; private set; }
    public Guid? MaterialRequestId { get; private set; }
    // Groups several MaterialDelivery rows created together as one bulk
    // "receipt document" (frontend-integration gap: the UI models one
    // document with several material lines, this entity is one line per
    // row). Null for every delivery created through the pre-existing
    // single-item path — this is purely additive.
    public Guid? DocumentId { get; private set; }
    public string MaterialName { get; private set; } = null!;
    public string Unit { get; private set; } = null!;
    public decimal Qty { get; private set; }
    public decimal UnitCost { get; private set; }
    public string? SupplierName { get; private set; }
    public DateTimeOffset DeliveredAt { get; private set; }
    public bool IsDeleted { get; set; }

    private MaterialDelivery() { }

    public static MaterialDelivery Create(
        Guid companyId,
        Guid objectId,
        string materialName,
        string unit,
        decimal qty,
        decimal unitCost,
        DateTimeOffset deliveredAt,
        Guid? materialRequestId = null,
        string? supplierName = null,
        Guid? documentId = null)
    {
        return new MaterialDelivery
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ObjectId = objectId,
            MaterialRequestId = materialRequestId,
            DocumentId = documentId,
            MaterialName = materialName,
            Unit = unit,
            Qty = qty,
            UnitCost = unitCost,
            SupplierName = supplierName,
            DeliveredAt = deliveredAt
        };
    }
}
