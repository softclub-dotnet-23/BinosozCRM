using Domain.Entities;

namespace Application.WorkOrders;

public sealed record TaskLogDto(
    Guid Id,
    string FromStatus,
    string ToStatus,
    Guid ChangedByUserId,
    DateTimeOffset ChangedAt,
    string? Comment)
{
    public static TaskLogDto FromEntity(TaskLog log) => new(
        log.Id,
        log.FromStatus,
        log.ToStatus,
        log.ChangedByUserId,
        log.ChangedAt,
        log.Comment);
}
