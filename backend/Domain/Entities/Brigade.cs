using Domain.Common;

namespace Domain.Entities;

public sealed class Brigade : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public string Name { get; private set; } = null!;
    public Guid? BrigadirUserId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool IsDeleted { get; set; }

    private Brigade() { }

    public static Brigade Create(Guid companyId, string name)
    {
        return new Brigade
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            Name = name,
            IsActive = true
        };
    }

    public void AssignBrigadir(Guid? userId) => BrigadirUserId = userId;

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
