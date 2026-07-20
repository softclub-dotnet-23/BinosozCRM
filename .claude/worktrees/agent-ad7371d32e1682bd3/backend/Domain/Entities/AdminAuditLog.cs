using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class AdminAuditLog : Entity, ICompanyOwned
{
    public Guid CompanyId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public AdminAuditAction Action { get; private set; }
    public string TargetEntityType { get; private set; } = null!;
    public Guid TargetEntityId { get; private set; }
    public string? OldValueJson { get; private set; }
    public string? NewValueJson { get; private set; }
    public DateTimeOffset At { get; private set; }
    public string? Ip { get; private set; }

    private AdminAuditLog() { }

    public static AdminAuditLog Create(
        Guid companyId,
        Guid actorUserId,
        AdminAuditAction action,
        string targetEntityType,
        Guid targetEntityId,
        DateTimeOffset at,
        string? oldValueJson = null,
        string? newValueJson = null,
        string? ip = null)
    {
        return new AdminAuditLog
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ActorUserId = actorUserId,
            Action = action,
            TargetEntityType = targetEntityType,
            TargetEntityId = targetEntityId,
            At = at,
            OldValueJson = oldValueJson,
            NewValueJson = newValueJson,
            Ip = ip
        };
    }
}
