using Domain.Common;

namespace Domain.Entities;

public sealed class TelegramUpdateLog : Entity
{
    public long UpdateId { get; private set; }
    public DateTimeOffset ProcessedAt { get; private set; }

    private TelegramUpdateLog() { }

    public static TelegramUpdateLog Create(long updateId, DateTimeOffset processedAt)
    {
        return new TelegramUpdateLog
        {
            Id = Guid.CreateVersion7(),
            UpdateId = updateId,
            ProcessedAt = processedAt
        };
    }
}
