using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class WorkOrder : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public string Code { get; private set; } = null!;
    public Guid ObjectId { get; private set; }
    public Guid BrigadeId { get; private set; }
    public Guid? EstimateItemId { get; private set; }
    public string Title { get; private set; } = null!;
    public string Unit { get; private set; } = null!;
    public decimal PlannedQty { get; private set; }
    public decimal UnitPrice { get; private set; }
    public WorkOrderStatus Status { get; private set; }
    public DateOnly? AssignedDate { get; private set; }
    public DateOnly? DueDate { get; private set; }
    public DateOnly? CompletedDate { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public bool IsDeleted { get; set; }

    private WorkOrder() { }

    public static WorkOrder Create(
        Guid companyId,
        string code,
        Guid objectId,
        Guid brigadeId,
        string title,
        string unit,
        decimal plannedQty,
        decimal unitPrice,
        Guid createdByUserId,
        Guid? estimateItemId = null,
        DateOnly? dueDate = null)
    {
        return new WorkOrder
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            Code = code,
            ObjectId = objectId,
            BrigadeId = brigadeId,
            EstimateItemId = estimateItemId,
            Title = title,
            Unit = unit,
            PlannedQty = plannedQty,
            UnitPrice = unitPrice,
            DueDate = dueDate,
            CreatedByUserId = createdByUserId,
            Status = WorkOrderStatus.New
        };
    }

    public Result Assign(DateOnly assignedDate)
    {
        if (Status != WorkOrderStatus.New)
            return InvalidTransition();

        AssignedDate = assignedDate;
        Status = WorkOrderStatus.Assigned;
        return Result.Success();
    }

    public Result Start()
    {
        if (Status != WorkOrderStatus.Assigned)
            return InvalidTransition();

        Status = WorkOrderStatus.InProgress;
        return Result.Success();
    }

    public Result SubmitForReview(bool hasProgress, bool payoutShareComplete)
    {
        if (Status != WorkOrderStatus.InProgress)
            return InvalidTransition();

        if (!hasProgress)
            return Result.Failure(new Error("WORK_ORDER_NO_PROGRESS", "At least one progress report is required before submitting for review."));

        if (!payoutShareComplete)
            return Result.Failure(new Error("WORK_ORDER_PAYOUT_SHARE_INCOMPLETE", "Payout shares must sum to 100% before submitting for review."));

        Status = WorkOrderStatus.OnReview;
        return Result.Success();
    }

    public Result Accept(DateOnly completedDate)
    {
        if (Status != WorkOrderStatus.OnReview)
            return InvalidTransition();

        Status = WorkOrderStatus.Accepted;
        CompletedDate = completedDate;
        return Result.Success();
    }

    public Result Reject()
    {
        if (Status != WorkOrderStatus.OnReview)
            return InvalidTransition();

        Status = WorkOrderStatus.Rejected;
        return Result.Success();
    }

    public Result Rework()
    {
        if (Status != WorkOrderStatus.Rejected)
            return InvalidTransition();

        Status = WorkOrderStatus.InProgress;
        return Result.Success();
    }

    public Result Close()
    {
        if (Status != WorkOrderStatus.Accepted)
            return InvalidTransition();

        Status = WorkOrderStatus.Closed;
        return Result.Success();
    }

    private static Result InvalidTransition() =>
        Result.Failure(new Error("WORK_ORDER_INVALID_TRANSITION", "Transition is not allowed from the current status."));
}
