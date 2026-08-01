using Application.Common.Interfaces;

namespace Api.IntegrationTests;

internal sealed class FixedBusinessTimeProvider(DateTimeOffset utcNow) : IBusinessTimeProvider
{
    private static readonly TimeZoneInfo Dushanbe = TimeZoneInfo.FindSystemTimeZoneById("Asia/Dushanbe");

    public DateTimeOffset UtcNow { get; } = utcNow.ToUniversalTime();

    public DateOnly Today => GetBusinessDate(UtcNow);

    public DateOnly GetBusinessDate(DateTimeOffset timestamp) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(timestamp.ToUniversalTime(), Dushanbe).DateTime);

    public DateTimeOffset GetBusinessDateTimeUtc(DateOnly businessDate, TimeOnly businessTime)
    {
        var localDateTime = businessDate.ToDateTime(businessTime, DateTimeKind.Unspecified);
        return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localDateTime, Dushanbe), TimeSpan.Zero);
    }

    public DateTimeOffset GetNextBusinessDayStartUtc(DateTimeOffset timestamp) =>
        GetBusinessDateTimeUtc(GetBusinessDate(timestamp).AddDays(1), TimeOnly.MinValue);
}
