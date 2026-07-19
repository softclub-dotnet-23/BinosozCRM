namespace Application.Common.Notifications;

public sealed record MaterialShortageReportedNotification(
    Guid ReportId,
    Guid ObjectId,
    string MaterialName,
    string Unit,
    decimal QtyShortage,
    DateOnly Date);
