using Application.Common.Options;
using Application.Payroll;
using Domain.Enums;
using FluentAssertions;
using Infrastructure.Time;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Api.IntegrationTests;

public sealed class BusinessTimeProviderTests
{
    [Fact]
    public void Business_date_switches_at_1900_utc_without_using_the_host_time_zone()
    {
        var provider = CreateProvider(new DateTimeOffset(2026, 7, 31, 19, 0, 0, TimeSpan.Zero));

        provider.GetBusinessDate(new DateTimeOffset(2026, 7, 31, 18, 59, 59, TimeSpan.Zero))
            .Should().Be(new DateOnly(2026, 7, 31));
        provider.Today.Should().Be(new DateOnly(2026, 8, 1));
    }

    [Fact]
    public void Payroll_cutoff_uses_the_Dushanbe_business_month_at_the_utc_boundary()
    {
        var beforeBoundary = CreateProvider(new DateTimeOffset(2026, 7, 31, 18, 59, 0, TimeSpan.Zero));
        var atBoundary = CreateProvider(new DateTimeOffset(2026, 7, 31, 19, 0, 0, TimeSpan.Zero));

        PayrollDraftGenerator.GetMostRecentlyEndedPeriod(beforeBoundary.Today, PayrollPeriodType.Monthly)
            .Should().Be((new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 30)));
        PayrollDraftGenerator.GetMostRecentlyEndedPeriod(atBoundary.Today, PayrollPeriodType.Monthly)
            .Should().Be((new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 31)));
    }

    [Fact]
    public void Background_schedule_targets_the_next_Dushanbe_midnight_in_utc()
    {
        var provider = CreateProvider(new DateTimeOffset(2026, 7, 31, 18, 30, 0, TimeSpan.Zero));

        provider.GetNextBusinessDayStartUtc(provider.UtcNow)
            .Should().Be(new DateTimeOffset(2026, 7, 31, 19, 0, 0, TimeSpan.Zero));
    }

    [Fact]
    public void Business_shift_start_is_converted_to_utc_while_serialized_instants_remain_utc()
    {
        var provider = CreateProvider(new DateTimeOffset(2026, 8, 1, 3, 0, 0, TimeSpan.Zero));
        var shiftStartUtc = provider.GetBusinessDateTimeUtc(new DateOnly(2026, 8, 1), new TimeOnly(8, 0));

        shiftStartUtc.Should().Be(new DateTimeOffset(2026, 8, 1, 3, 0, 0, TimeSpan.Zero));
        JsonSerializer.Serialize(shiftStartUtc).Should().Be("\"2026-08-01T03:00:00+00:00\"");
    }

    private static BusinessTimeProvider CreateProvider(DateTimeOffset now) => new(
        Options.Create(new BusinessTimeOptions { TimeZoneId = BusinessTimeOptions.AsiaDushanbeTimeZoneId }),
        new FixedTimeProvider(now));

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
