using Domain.Common;

namespace Domain.Entities;

public sealed class PayrollAdvance : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid WorkerId { get; private set; }
    public decimal Amount { get; private set; }
    public DateTimeOffset IssuedAt { get; private set; }
    public Guid IssuedByUserId { get; private set; }
    public string? Note { get; private set; }
    public Guid? SettledInPayrollEntryId { get; private set; }
    public bool IsDeleted { get; set; }

    private PayrollAdvance() { }

    public static PayrollAdvance Create(
        Guid companyId,
        Guid workerId,
        decimal amount,
        DateTimeOffset issuedAt,
        Guid issuedByUserId,
        string? note = null)
    {
        return new PayrollAdvance
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            WorkerId = workerId,
            Amount = amount,
            IssuedAt = issuedAt,
            IssuedByUserId = issuedByUserId,
            Note = note
        };
    }

    public void Settle(Guid payrollEntryId) => SettledInPayrollEntryId = payrollEntryId;
}
