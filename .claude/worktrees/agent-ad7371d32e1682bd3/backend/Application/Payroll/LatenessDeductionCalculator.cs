using Application.Common.Interfaces;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.1: "LatenessDeductionAmount = Σ LateMinutes за период ×
// (PayRate / 60)." LateMinutes itself is computed once at check-in
// (Timesheet.CheckIn, Phase 3 Step 1) and never recalculated — this is
// purely the period-level sum §8.1 describes but never had anywhere to
// live until PayrollEntry.LatenessDeductionAmount existed to hold it.
//
// A Timesheet with LateMinutes == null (Worker.ShiftStartTime wasn't
// configured that day, §8.1's "не 0!" rule) is excluded from the sum
// rather than treated as 0 — counting it as zero would silently hide the
// missing-configuration case this null exists to flag in the first place.
// Not gated on ApprovedAt: §8.1 doesn't state that gate (unlike §8.0's
// explicit "только принятые табели" for CalculatedAmount itself), so
// nothing invented here.
internal static class LatenessDeductionCalculator
{
    public static async Task<decimal> ComputeAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly periodStart,
        DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        var lateMinutesSum = await context.Timesheets
            .Where(t => t.WorkerId == worker.Id
                        && t.Date >= periodStart && t.Date <= periodEnd
                        && t.LateMinutes != null)
            .SumAsync(t => (int?)t.LateMinutes, cancellationToken) ?? 0;

        return lateMinutesSum * (worker.PayRate / 60m);
    }
}
