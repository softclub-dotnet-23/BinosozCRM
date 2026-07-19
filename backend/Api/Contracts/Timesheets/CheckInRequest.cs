namespace Api.Contracts.Timesheets;

public sealed record CheckInRequest(Guid WorkerId, Guid ObjectId);

public sealed record CreateTimesheetRequest(
    Guid WorkerId,
    Guid ObjectId,
    DateOnly Date,
    DateTimeOffset? CheckInAt,
    DateTimeOffset? CheckOutAt);
