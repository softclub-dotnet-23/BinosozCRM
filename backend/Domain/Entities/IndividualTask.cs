using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class IndividualTask : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public string Code { get; private set; } = null!;
    public Guid? WorkOrderId { get; private set; }
    public Guid BrigadeId { get; private set; }
    public Guid AssignedToWorkerId { get; private set; }
    public string Title { get; private set; } = null!;
    public string? Description { get; private set; }
    public DateTimeOffset? DueAt { get; private set; }
    public IndividualTaskStatus Status { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public bool? CompletedEarly { get; private set; }
    public decimal? BonusAmount { get; private set; }
    public Guid? BonusApprovedByUserId { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public bool IsDeleted { get; set; }

    private IndividualTask() { }

    public static IndividualTask Create(
        Guid companyId,
        string code,
        Guid brigadeId,
        Guid assignedToWorkerId,
        string title,
        Guid createdByUserId,
        Guid? workOrderId = null,
        string? description = null,
        DateTimeOffset? dueAt = null)
    {
        return new IndividualTask
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            Code = code,
            WorkOrderId = workOrderId,
            BrigadeId = brigadeId,
            AssignedToWorkerId = assignedToWorkerId,
            Title = title,
            Description = description,
            DueAt = dueAt,
            CreatedByUserId = createdByUserId,
            Status = IndividualTaskStatus.Assigned
        };
    }

    public Result Start(DateTimeOffset startedAt)
    {
        if (Status != IndividualTaskStatus.Assigned)
            return InvalidTransition();

        Status = IndividualTaskStatus.InProgress;
        StartedAt = startedAt;
        return Result.Success();
    }

    public Result Complete(DateTimeOffset completedAt)
    {
        if (Status != IndividualTaskStatus.InProgress)
            return InvalidTransition();

        Status = IndividualTaskStatus.Done;
        CompletedAt = completedAt;
        CompletedEarly = DueAt is not null && completedAt < DueAt.Value;
        return Result.Success();
    }

    public Result ProposeBonus(decimal bonusAmount)
    {
        if (Status != IndividualTaskStatus.Done)
            return InvalidTransition();

        BonusAmount = bonusAmount;
        return Result.Success();
    }

    public Result ApproveBonus(Guid approvedByUserId)
    {
        if (Status != IndividualTaskStatus.Done || BonusAmount is null)
            return InvalidTransition();

        // §9.2's BONUS_NOT_ELIGIBLE: "подтверждение премии на задаче без
        // CompletedEarly" — a task completed on or after DueAt was never
        // eligible for a bonus in the first place, regardless of whether
        // one was proposed.
        if (CompletedEarly != true)
            return Result.Failure(new Error("BONUS_NOT_ELIGIBLE", "Bonus can only be approved for a task completed before its due date."));

        BonusApprovedByUserId = approvedByUserId;
        return Result.Success();
    }

    private static Result InvalidTransition() =>
        Result.Failure(new Error("INDIVIDUAL_TASK_INVALID_TRANSITION", "Transition is not allowed from the current status."));
}
