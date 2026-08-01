using Application.Common.Interfaces;
using Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Infrastructure.Time;

public sealed class BusinessTimeProvider : IBusinessTimeProvider
{
    private readonly TimeZoneInfo _timeZone;
    private readonly TimeProvider _timeProvider;

    public BusinessTimeProvider(IOptions<BusinessTimeOptions> options, TimeProvider timeProvider)
    {
        _timeZone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZoneId);
        _timeProvider = timeProvider;
    }

    public DateTimeOffset UtcNow => _timeProvider.GetUtcNow().ToUniversalTime();

    public DateOnly Today => GetBusinessDate(UtcNow);

    public DateOnly GetBusinessDate(DateTimeOffset timestamp)
    {
        var localTimestamp = TimeZoneInfo.ConvertTime(timestamp.ToUniversalTime(), _timeZone);
        return DateOnly.FromDateTime(localTimestamp.DateTime);
    }

    public DateTimeOffset GetBusinessDateTimeUtc(DateOnly businessDate, TimeOnly businessTime)
    {
        var localDateTime = businessDate.ToDateTime(businessTime, DateTimeKind.Unspecified);
        var utcDateTime = TimeZoneInfo.ConvertTimeToUtc(localDateTime, _timeZone);
        return new DateTimeOffset(utcDateTime, TimeSpan.Zero);
    }

    public DateTimeOffset GetNextBusinessDayStartUtc(DateTimeOffset timestamp)
    {
        var nextBusinessDate = GetBusinessDate(timestamp).AddDays(1);
        return GetBusinessDateTimeUtc(nextBusinessDate, TimeOnly.MinValue);
    }
}
