using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

// New entity (Worker-dashboard checkpoint, docs/PROGRESS.md): a Worker/
// Brigadir reporting a problem on an object they work on. Minimal by design
// — no routing/notification infrastructure, just a persisted report a
// Prorab+ reads and resolves. Mirrors MaterialRequest's shape (requester +
// object + free-text + status) rather than inventing a new pattern.
public sealed class IssueReport : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid ObjectId { get; private set; }
    public Guid? IndividualTaskId { get; private set; }
    public Guid ReportedByUserId { get; private set; }
    public string Title { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public string? PhotoUrl { get; private set; }
    public IssueReportStatus Status { get; private set; }
    public DateTimeOffset ReportedAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public Guid? ResolvedByUserId { get; private set; }
    public bool IsDeleted { get; set; }

    private IssueReport() { }

    public static IssueReport Create(
        Guid companyId,
        Guid objectId,
        Guid reportedByUserId,
        string title,
        string description,
        DateTimeOffset reportedAt,
        Guid? individualTaskId = null,
        string? photoUrl = null)
    {
        return new IssueReport
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ObjectId = objectId,
            IndividualTaskId = individualTaskId,
            ReportedByUserId = reportedByUserId,
            Title = title,
            Description = description,
            PhotoUrl = photoUrl,
            Status = IssueReportStatus.Open,
            ReportedAt = reportedAt
        };
    }

    public Result Resolve(Guid resolvedByUserId, DateTimeOffset resolvedAt)
    {
        if (Status != IssueReportStatus.Open)
            return Result.Failure(new Error("ISSUE_REPORT_INVALID_TRANSITION", "Issue report is already resolved."));

        Status = IssueReportStatus.Resolved;
        ResolvedByUserId = resolvedByUserId;
        ResolvedAt = resolvedAt;
        return Result.Success();
    }
}
