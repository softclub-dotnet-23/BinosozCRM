using Domain.Enums;

namespace Application.Payroll;

// MASTER §11.8/§2: the background job's period-boundary logic, pulled out
// as a pure static class so it's unit-testable without spinning up a
// hosted service. Company.PayrollPeriodType (§5.1) drives both halves:
// which dates count as "period end" and what period a given date falls
// inside.
public static class PayrollPeriodCalculator
{
    public static bool IsPeriodEnd(DateOnly date, PayrollPeriodType periodType)
    {
        var lastDayOfMonth = DateOnly.FromDateTime(new DateTime(date.Year, date.Month, 1).AddMonths(1).AddDays(-1));

        return periodType switch
        {
            PayrollPeriodType.Monthly => date == lastDayOfMonth,
            PayrollPeriodType.SemiMonthly => date.Day == 15 || date == lastDayOfMonth,
            _ => throw new ArgumentOutOfRangeException(nameof(periodType), periodType, null)
        };
    }

    public static (DateOnly Start, DateOnly End) GetPeriodContaining(DateOnly date, PayrollPeriodType periodType)
    {
        var firstDayOfMonth = new DateOnly(date.Year, date.Month, 1);
        var lastDayOfMonth = DateOnly.FromDateTime(new DateTime(date.Year, date.Month, 1).AddMonths(1).AddDays(-1));

        if (periodType == PayrollPeriodType.Monthly)
            return (firstDayOfMonth, lastDayOfMonth);

        return date.Day <= 15
            ? (firstDayOfMonth, new DateOnly(date.Year, date.Month, 15))
            : (new DateOnly(date.Year, date.Month, 16), lastDayOfMonth);
    }
}
