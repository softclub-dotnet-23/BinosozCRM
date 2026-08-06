using Domain.Common;

namespace Domain.Entities;

public sealed class MaterialDelivery : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid ObjectId { get; private set; }
    public Guid? MaterialRequestId { get; private set; }
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
        string? supplierName = null)
    {
        return new MaterialDelivery
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ObjectId = objectId,
            MaterialRequestId = materialRequestId,
            MaterialName = materialName,
            Unit = unit,
            Qty = qty,
            UnitCost = unitCost,
            SupplierName = supplierName,
            DeliveredAt = deliveredAt
        };
    }
}
