using Domain.Common;

namespace Domain.Entities;

public sealed class MaterialConsumptionReport : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid ObjectId { get; private set; }
    public Guid BrigadeId { get; private set; }
    public Guid ReportedByUserId { get; private set; }
    public DateOnly Date { get; private set; }
    public string MaterialName { get; private set; } = null!;
    public string Unit { get; private set; } = null!;
    public decimal QtyUsed { get; private set; }
    public decimal QtyShortage { get; private set; }
    public string? Comment { get; private set; }
    public bool IsDeleted { get; set; }

    private MaterialConsumptionReport() { }

    public static MaterialConsumptionReport Create(
        Guid companyId,
        Guid objectId,
        Guid brigadeId,
        Guid reportedByUserId,
        DateOnly date,
        string materialName,
        string unit,
        decimal qtyUsed,
        decimal qtyShortage,
        string? comment = null)
    {
        return new MaterialConsumptionReport
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ObjectId = objectId,
            BrigadeId = brigadeId,
            ReportedByUserId = reportedByUserId,
            Date = date,
            MaterialName = materialName,
            Unit = unit,
            QtyUsed = qtyUsed,
            QtyShortage = qtyShortage,
            Comment = comment
        };
    }

    public void UpdateUsage(decimal qtyUsed, decimal qtyShortage, string? comment)
    {
        QtyUsed = qtyUsed;
        QtyShortage = qtyShortage;
        Comment = comment;
    }
}
