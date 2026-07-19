using Domain.Entities;

namespace Application.WorkOrders;

public sealed record WorkOrderPayoutShareDto(
    Guid Id,
    Guid WorkOrderId,
    Guid WorkerId,
    decimal SharePercent,
    decimal? Amount,
    Guid SetByUserId,
    Guid? ApprovedByUserId)
{
    public static WorkOrderPayoutShareDto FromEntity(WorkOrderPayoutShare share) => new(
        share.Id,
        share.WorkOrderId,
        share.WorkerId,
        share.SharePercent,
        share.Amount,
        share.SetByUserId,
        share.ApprovedByUserId);
}
