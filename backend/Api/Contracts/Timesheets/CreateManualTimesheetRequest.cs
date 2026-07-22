namespace Api.Contracts.Timesheets;

public sealed record CreateManualTimesheetRequest(
    Guid WorkerId,
    Guid ObjectId,
    DateOnly Date,
    DateTimeOffset CheckInAt,
    DateTimeOffset? CheckOutAt);
