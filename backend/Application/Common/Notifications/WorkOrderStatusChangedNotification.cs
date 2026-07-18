namespace Application.Common.Notifications;

public sealed record WorkOrderStatusChangedNotification(
    Guid WorkOrderId,
    string Code,
    string FromStatus,
    string ToStatus,
    DateTimeOffset ChangedAt);
