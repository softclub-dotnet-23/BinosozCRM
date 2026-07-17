using Domain.Common;

namespace Domain.Entities;

public sealed class Timesheet : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid WorkerId { get; private set; }
    public Guid ObjectId { get; private set; }
    public DateOnly Date { get; private set; }
    public TimeOnly? PlannedStartTime { get; private set; }
    public DateTimeOffset? CheckInAt { get; private set; }
    public DateTimeOffset? CheckOutAt { get; private set; }
    public int? LateMinutes { get; private set; }
    public decimal? HoursWorked { get; private set; }
    public Guid? WorkOrderProgressId { get; private set; }
    public bool EnteredManually { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public bool IsDeleted { get; set; }

    private Timesheet() { }

    public static Timesheet Create(
        Guid companyId,
        Guid workerId,
        Guid objectId,
        DateOnly date,
        TimeOnly? plannedStartTime,
        bool enteredManually = false)
    {
        return new Timesheet
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            WorkerId = workerId,
            ObjectId = objectId,
            Date = date,
            PlannedStartTime = plannedStartTime,
            EnteredManually = enteredManually
        };
    }

    public void CheckIn(DateTimeOffset checkInAt, int latenessGraceMinutes)
    {
        CheckInAt = checkInAt;

        if (PlannedStartTime is null)
        {
            LateMinutes = null;
            return;
        }

        var plannedStart = new DateTimeOffset(Date, PlannedStartTime.Value, checkInAt.Offset);
        var lateMinutes = (int)Math.Max(0, (checkInAt - plannedStart).TotalMinutes) - latenessGraceMinutes;
        LateMinutes = Math.Max(0, lateMinutes);
    }

    public void CheckOut(DateTimeOffset checkOutAt)
    {
        CheckOutAt = checkOutAt;

        if (CheckInAt is not null)
            HoursWorked = (decimal)(checkOutAt - CheckInAt.Value).TotalHours;
    }

    public void Approve(Guid approvedByUserId, DateTimeOffset approvedAt)
    {
        ApprovedByUserId = approvedByUserId;
        ApprovedAt = approvedAt;
    }

    public void LinkWorkOrderProgress(Guid workOrderProgressId) => WorkOrderProgressId = workOrderProgressId;
}
