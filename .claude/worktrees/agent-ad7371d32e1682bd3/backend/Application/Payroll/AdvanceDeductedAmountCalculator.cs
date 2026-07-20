using Application.Common.Interfaces;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.8: "AdvanceDeductedAmount = Σ PayrollAdvance.Amount где
// WorkerId = worker и SettledInPayrollEntryId IS NULL и IssuedAt <=
// PeriodEnd." Unsettled advances only — once an advance is stamped with a
// SettledInPayrollEntryId (Step 7's Approve), it stops counting here, so
// re-generating a later Draft never double-deducts an advance that was
// already applied to a previous period's Approved entry. An advance
// issued after PeriodEnd rolls into the next period's calculation, not
// this one — the IssuedAt <= PeriodEnd bound is what does that.
internal static class AdvanceDeductedAmountCalculator
{
    public static async Task<decimal> ComputeAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        var periodEndBoundary = new DateTimeOffset(periodEnd, TimeOnly.MaxValue, TimeSpan.Zero);

        return await context.PayrollAdvances
            .Where(a => a.WorkerId == worker.Id && a.SettledInPayrollEntryId == null && a.IssuedAt <= periodEndBoundary)
            .SumAsync(a => (decimal?)a.Amount, cancellationToken) ?? 0m;
    }
}
