using Domain.Common;

namespace Domain.Entities;

public sealed class ProrabObjectAssignment : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid ProrabUserId { get; private set; }
    public Guid ObjectId { get; private set; }
    public DateTimeOffset AssignedAt { get; private set; }
    public Guid AssignedByUserId { get; private set; }
    public bool IsDeleted { get; set; }

    private ProrabObjectAssignment() { }

    public static ProrabObjectAssignment Create(
        Guid companyId,
        Guid prorabUserId,
        Guid objectId,
        DateTimeOffset assignedAt,
        Guid assignedByUserId)
    {
        return new ProrabObjectAssignment
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ProrabUserId = prorabUserId,
            ObjectId = objectId,
            AssignedAt = assignedAt,
            AssignedByUserId = assignedByUserId
        };
    }
}
