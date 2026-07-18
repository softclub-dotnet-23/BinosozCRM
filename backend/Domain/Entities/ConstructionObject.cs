using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class ConstructionObject : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Address { get; private set; }
    public Guid CustomerId { get; private set; }
    public ConstructionObjectStatus Status { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? PlannedEndDate { get; private set; }
    public DateOnly? ActualEndDate { get; private set; }
    public decimal? Budget { get; private set; }
    public bool IsDeleted { get; set; }

    private ConstructionObject() { }

    public static ConstructionObject Create(
        Guid companyId,
        string name,
        Guid customerId,
        string? address = null,
        DateOnly? startDate = null,
        DateOnly? plannedEndDate = null,
        decimal? budget = null)
    {
        return new ConstructionObject
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            Name = name,
            CustomerId = customerId,
            Address = address,
            StartDate = startDate,
            PlannedEndDate = plannedEndDate,
            Budget = budget,
            Status = ConstructionObjectStatus.Planned
        };
    }

    public void ChangeStatus(ConstructionObjectStatus status) => Status = status;

    public void Complete(DateOnly actualEndDate)
    {
        Status = ConstructionObjectStatus.Completed;
        ActualEndDate = actualEndDate;
    }
}
