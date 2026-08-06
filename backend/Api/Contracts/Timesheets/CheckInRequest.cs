namespace Api.Contracts.Timesheets;

public sealed record CheckInRequest(Guid WorkerId, Guid ObjectId);
