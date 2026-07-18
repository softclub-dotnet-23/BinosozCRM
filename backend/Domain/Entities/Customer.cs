using Domain.Common;

namespace Domain.Entities;

public sealed class Customer : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public string Name { get; private set; } = null!;
    public string? ContactPerson { get; private set; }
    public string? ContactPhone { get; private set; }
    public bool IsDeleted { get; set; }

    private Customer() { }

    public static Customer Create(Guid companyId, string name, string? contactPerson = null, string? contactPhone = null)
    {
        return new Customer
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            Name = name,
            ContactPerson = contactPerson,
            ContactPhone = contactPhone
        };
    }

    public void Update(string name, string? contactPerson, string? contactPhone)
    {
        Name = name;
        ContactPerson = contactPerson;
        ContactPhone = contactPhone;
    }
}
