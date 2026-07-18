using Domain.Common;

namespace Domain.Entities;

public sealed class WorkOrderPayoutShare : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid WorkOrderId { get; private set; }
    public Guid WorkerId { get; private set; }
    public decimal SharePercent { get; private set; }
    public decimal? Amount { get; private set; }
    public Guid SetByUserId { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public bool IsDeleted { get; set; }

    private WorkOrderPayoutShare() { }

    public static WorkOrderPayoutShare Create(
        Guid companyId,
        Guid workOrderId,
        Guid workerId,
        decimal sharePercent,
        Guid setByUserId)
    {
        return new WorkOrderPayoutShare
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            WorkOrderId = workOrderId,
            WorkerId = workerId,
            SharePercent = sharePercent,
            SetByUserId = setByUserId
        };
    }

    public void Approve(Guid approvedByUserId, decimal amount)
    {
        ApprovedByUserId = approvedByUserId;
        Amount = amount;
    }
}
