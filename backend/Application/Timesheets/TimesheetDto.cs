using Domain.Entities;

namespace Application.Timesheets;

public sealed record TimesheetDto(
    Guid Id,
    Guid WorkerId,
    Guid ObjectId,
    DateOnly Date,
    TimeOnly? PlannedStartTime,
    DateTimeOffset? CheckInAt,
    DateTimeOffset? CheckOutAt,
    int? LateMinutes,
    decimal? HoursWorked,
    bool EnteredManually,
    Guid? ApprovedByUserId,
    DateTimeOffset? ApprovedAt)
{
    public static TimesheetDto FromEntity(Timesheet timesheet) => new(
        timesheet.Id,
        timesheet.WorkerId,
        timesheet.ObjectId,
        timesheet.Date,
        timesheet.PlannedStartTime,
        timesheet.CheckInAt,
        timesheet.CheckOutAt,
        timesheet.LateMinutes,
        timesheet.HoursWorked,
        timesheet.EnteredManually,
        timesheet.ApprovedByUserId,
        timesheet.ApprovedAt);
}
