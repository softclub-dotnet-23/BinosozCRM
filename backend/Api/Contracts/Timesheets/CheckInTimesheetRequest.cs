namespace Api.Contracts.Timesheets;

public sealed record CheckInTimesheetRequest(Guid WorkerId, Guid ObjectId);
