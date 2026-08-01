using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

// Immutable effective-dated rate snapshot. Piecework can be zero because its
// compensation is represented by approved work-order payout shares.
public sealed class WorkerPayRateHistory : AuditableEntity, ICompanyOwned
{
    public Guid CompanyId { get; private set; }
    public Guid WorkerId { get; private set; }
    public PayRateType PayRateType { get; private set; }
    public decimal PayRate { get; private set; }
    public DateOnly EffectiveFrom { get; private set; }

    private WorkerPayRateHistory() { }

    public static WorkerPayRateHistory Create(Guid companyId, Guid workerId, PayRateType payRateType, decimal payRate, DateOnly effectiveFrom)
    {
        Worker.ValidatePayRate(payRateType, payRate);
        return new WorkerPayRateHistory
        {
            Id = Guid.CreateVersion7(), CompanyId = companyId, WorkerId = workerId,
            PayRateType = payRateType, PayRate = payRate, EffectiveFrom = effectiveFrom
        };
    }
}
