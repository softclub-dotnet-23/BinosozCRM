using Domain.Common;

namespace Domain.Entities;

public sealed class WorkOrderProgress : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid WorkOrderId { get; private set; }
    public Guid ReportedByUserId { get; private set; }
    public decimal ReportedQty { get; private set; }
    public IReadOnlyCollection<string> PhotoUrls { get; private set; } = [];
    public string? Comment { get; private set; }
    public DateTimeOffset ReportedAt { get; private set; }
    public bool IsDeleted { get; set; }

    private WorkOrderProgress() { }

    public static WorkOrderProgress Create(
        Guid companyId,
        Guid workOrderId,
        Guid reportedByUserId,
        decimal reportedQty,
        DateTimeOffset reportedAt,
        IReadOnlyCollection<string>? photoUrls = null,
        string? comment = null)
    {
        return new WorkOrderProgress
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            WorkOrderId = workOrderId,
            ReportedByUserId = reportedByUserId,
            ReportedQty = reportedQty,
            ReportedAt = reportedAt,
            PhotoUrls = photoUrls ?? [],
            Comment = comment
        };
    }
}
