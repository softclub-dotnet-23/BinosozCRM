using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class MaterialRequest : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid ObjectId { get; private set; }
    public Guid BrigadeId { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public string MaterialName { get; private set; } = null!;
    public string Unit { get; private set; } = null!;
    public decimal Qty { get; private set; }
    public decimal QtyDelivered { get; private set; }
    public MaterialRequestStatus Status { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public DateTimeOffset? DeliveredAt { get; private set; }
    public string? Comment { get; private set; }
    public bool IsDeleted { get; set; }

    private MaterialRequest() { }

    public static MaterialRequest Create(
        Guid companyId,
        Guid objectId,
        Guid brigadeId,
        Guid requestedByUserId,
        string materialName,
        string unit,
        decimal qty,
        DateTimeOffset requestedAt)
    {
        return new MaterialRequest
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            ObjectId = objectId,
            BrigadeId = brigadeId,
            RequestedByUserId = requestedByUserId,
            MaterialName = materialName,
            Unit = unit,
            Qty = qty,
            Status = MaterialRequestStatus.Requested,
            RequestedAt = requestedAt
        };
    }

    public Result Approve(Guid approvedByUserId, DateTimeOffset approvedAt)
    {
        if (Status != MaterialRequestStatus.Requested)
            return InvalidTransition();

        Status = MaterialRequestStatus.Approved;
        ApprovedByUserId = approvedByUserId;
        ApprovedAt = approvedAt;
        return Result.Success();
    }

    public Result Reject()
    {
        if (Status is MaterialRequestStatus.Delivered or MaterialRequestStatus.Rejected)
            return InvalidTransition();

        Status = MaterialRequestStatus.Rejected;
        return Result.Success();
    }

    public Result MarkOrdered()
    {
        if (Status != MaterialRequestStatus.Approved)
            return InvalidTransition();

        Status = MaterialRequestStatus.Ordered;
        return Result.Success();
    }

    public Result RecordDelivery(decimal qtyDelivered, DateTimeOffset deliveredAt)
    {
        if (Status is not (MaterialRequestStatus.Ordered or MaterialRequestStatus.PartiallyDelivered))
            return InvalidTransition();

        QtyDelivered += qtyDelivered;
        DeliveredAt = deliveredAt;
        Status = QtyDelivered >= Qty ? MaterialRequestStatus.Delivered : MaterialRequestStatus.PartiallyDelivered;
        return Result.Success();
    }

    // §7.3/§9.4 require an "обязательный комментарий" on force-close —
    // validated as required at the API boundary; persisted here so it's
    // not silently discarded.
    public Result ForceDeliver(string comment)
    {
        if (Status != MaterialRequestStatus.PartiallyDelivered)
            return InvalidTransition();

        Status = MaterialRequestStatus.Delivered;
        Comment = comment;
        return Result.Success();
    }

    private static Result InvalidTransition() =>
        Result.Failure(new Error("MATERIAL_REQUEST_INVALID_TRANSITION", "Transition is not allowed from the current status."));
}
