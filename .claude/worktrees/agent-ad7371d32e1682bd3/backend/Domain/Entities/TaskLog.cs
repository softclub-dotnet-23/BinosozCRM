using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class TaskLog : Entity, ICompanyOwned
{
    public Guid CompanyId { get; private set; }
    public TaskLogEntityType EntityType { get; private set; }
    public Guid EntityId { get; private set; }
    public string FromStatus { get; private set; } = null!;
    public string ToStatus { get; private set; } = null!;
    public Guid ChangedByUserId { get; private set; }
    public DateTimeOffset ChangedAt { get; private set; }
    public string? Comment { get; private set; }

    private TaskLog() { }

    public static TaskLog Create(
        Guid companyId,
        TaskLogEntityType entityType,
        Guid entityId,
        string fromStatus,
        string toStatus,
        Guid changedByUserId,
        DateTimeOffset changedAt,
        string? comment = null)
    {
        return new TaskLog
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            EntityType = entityType,
            EntityId = entityId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            ChangedByUserId = changedByUserId,
            ChangedAt = changedAt,
            Comment = comment
        };
    }
}
