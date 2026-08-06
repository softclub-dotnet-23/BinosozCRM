using Domain.Common;

namespace Domain.Entities;

public sealed class EstimateItem : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid ObjectId { get; private set; }
    public string WorkType { get; private set; } = null!;
    public string Unit { get; private set; } = null!;
    public decimal PlannedQty { get; private set; }
    public decimal PlannedUnitPrice { get; private set; }
    public string? Stage { get; private set; }
    public bool IsDeleted { get; set; }

    private EstimateItem() { }

    public static EstimateItem Create(
        Guid companyId,
        Guid objectId,
        string workType,
        string unit,
        decimal plannedQty,
        decimal plannedUnitPrice,
        string? stage = null)
    {
        return new EstimateItem
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ObjectId = objectId,
            WorkType = workType,
            Unit = unit,
            PlannedQty = plannedQty,
            PlannedUnitPrice = plannedUnitPrice,
            Stage = stage
        };
    }

    public void Update(decimal plannedQty, decimal plannedUnitPrice, string? stage)
    {
        PlannedQty = plannedQty;
        PlannedUnitPrice = plannedUnitPrice;
        Stage = stage;
    }
}
