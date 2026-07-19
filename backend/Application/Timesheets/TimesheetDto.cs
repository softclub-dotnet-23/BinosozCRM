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
    // LateMinutes is null when Worker.ShiftStartTime was never configured
    // (MASTER §8.1) — deliberately NOT coalesced to 0 here. A silent 0 would
    // look like "arrived on time" instead of "we can't tell"; null is the
    // caller's cue to warn the Prorab that the worker's shift time isn't set.
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
