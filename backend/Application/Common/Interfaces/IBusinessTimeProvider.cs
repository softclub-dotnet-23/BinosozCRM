namespace Application.Common.Interfaces;

// Business timestamps remain UTC in persistence. This abstraction is only
// responsible for deriving the approved business calendar (Asia/Dushanbe)
// from those instants, so application code never falls back to the host
// machine's local time zone.
public interface IBusinessTimeProvider
{
    DateTimeOffset UtcNow { get; }

    DateOnly Today { get; }

    DateOnly GetBusinessDate(DateTimeOffset timestamp);

    DateTimeOffset GetBusinessDateTimeUtc(DateOnly businessDate, TimeOnly businessTime);

    DateTimeOffset GetNextBusinessDayStartUtc(DateTimeOffset timestamp);
}
