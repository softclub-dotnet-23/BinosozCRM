using Domain.Entities;
using FluentAssertions;

namespace Api.IntegrationTests;

// MASTER §8.1's worked numeric examples, exercised directly against
// Timesheet.CheckIn (pure domain, no DB — deterministic times instead of
// "now", same reasoning as WorkOrderStateMachineTests). §8.1: "Опоздания за
// месяц: 15, 0, 40, 10, 0" — this file checks each individual LateMinutes
// reading against both grace configurations from that example; the Σ and
// the LatenessDeductionAmount aggregation across a period is Phase 5 Step
// 4's job (needs a period-level query this codebase doesn't have yet).
public sealed class TimesheetLateMinutesTests
{
    private static Timesheet CheckedInAt(TimeOnly plannedStart, int minutesLate, int latenessGraceMinutes)
    {
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        var timesheet = Timesheet.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), date, plannedStart);

        var plannedStartAt = new DateTimeOffset(date, plannedStart, TimeSpan.Zero);
        timesheet.CheckIn(plannedStartAt.AddMinutes(minutesLate), latenessGraceMinutes);

        return timesheet;
    }

    // §8.1 example set, grace = 0: 15, 0, 40, 10, 0 minutes late ->
    // LateMinutes unchanged (grace doesn't shave anything off).
    [Theory]
    [InlineData(15, 15)]
    [InlineData(0, 0)]
    [InlineData(40, 40)]
    [InlineData(10, 10)]
    public void LateMinutes_matches_MASTER_example_with_zero_grace(int minutesLate, int expectedLateMinutes)
    {
        var timesheet = CheckedInAt(new TimeOnly(8, 0), minutesLate, latenessGraceMinutes: 0);

        timesheet.LateMinutes.Should().Be(expectedLateMinutes);
    }

    // §8.1's grace=5 example: same five arrivals, each grace-adjusted:
    // 15->10, 0->0, 40->35, 10->5, 0->0.
    [Theory]
    [InlineData(15, 10)]
    [InlineData(0, 0)]
    [InlineData(40, 35)]
    [InlineData(10, 5)]
    public void LateMinutes_applies_grace_period_per_MASTER_example(int minutesLate, int expectedLateMinutes)
    {
        var timesheet = CheckedInAt(new TimeOnly(8, 0), minutesLate, latenessGraceMinutes: 5);

        timesheet.LateMinutes.Should().Be(expectedLateMinutes);
    }

    [Fact]
    public void Arriving_within_the_grace_period_never_goes_negative()
    {
        // 3 minutes late against a 5-minute grace: max(0, 3) - 5 would be
        // negative without the second Math.Max(0, ...) — must clamp, not
        // wrap or go negative.
        var timesheet = CheckedInAt(new TimeOnly(8, 0), minutesLate: 3, latenessGraceMinutes: 5);

        timesheet.LateMinutes.Should().Be(0);
    }

    [Fact]
    public void Arriving_early_gives_zero_late_minutes_not_negative()
    {
        var timesheet = CheckedInAt(new TimeOnly(8, 0), minutesLate: -10, latenessGraceMinutes: 0);

        timesheet.LateMinutes.Should().Be(0);
    }

    [Fact]
    public void LateMinutes_is_null_not_zero_when_ShiftStartTime_is_unconfigured()
    {
        // §8.1: "ShiftStartTime не задан -> LateMinutes = null (не 0!)" —
        // a silent zero would hide the missing configuration from the
        // prorab instead of surfacing it.
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        var timesheet = Timesheet.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), date, plannedStartTime: null);

        timesheet.CheckIn(DateTimeOffset.UtcNow, latenessGraceMinutes: 0);

        timesheet.LateMinutes.Should().BeNull();
    }
}
