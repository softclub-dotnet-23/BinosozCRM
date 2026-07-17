namespace Domain.Common;

public abstract class AuditableEntity : Entity
{
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ModifiedAt { get; set; }

    protected AuditableEntity() { }

    protected AuditableEntity(Guid id) : base(id) { }
}
