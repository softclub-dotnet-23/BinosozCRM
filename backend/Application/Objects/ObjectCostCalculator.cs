using Application.Common.Interfaces;
using Application.Payroll;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// Extracted from GetObjectCostBreakdownQueryHandler so ListObjectBudgetsQueryHandler can
// compute the same actual-cost figure for every object without duplicating the business
// rules from MASTER §8.10 (materials + piecework + hourly + paid absence).
internal static class ObjectCostCalculator
{
    public static async Task<(decimal MaterialCost, decimal PieceworkCost, decimal HourlyCost, decimal AbsenceCost)> ComputeAsync(
        IApplicationDbContext context, Guid objectId, CancellationToken cancellationToken)
    {
        var materialCost = await context.MaterialDeliveries
            .AsNoTracking()
            .Where(d => d.ObjectId == objectId)
            .SumAsync(d => (decimal?)(d.UnitCost * d.Qty), cancellationToken) ?? 0m;

        var pieceworkCost = await ComputePieceworkCostAsync(context, objectId, cancellationToken);
        var (hourlyCost, absenceCost) = await ComputeHourlyAndAbsenceCostAsync(context, objectId, cancellationToken);

        return (materialCost, pieceworkCost, hourlyCost, absenceCost);
    }

    // §8.10: "Piecework — прямо: WorkOrderPayoutShare.Amount ->
    // WorkOrder.ObjectId. Точно, без допущений." Reads the Amount snapshot
    // WorkOrderPayoutShare.Approve() sets (WorkOrderPayoutShares zone, merge
    // Step 3) directly, rather than recomputing from SharePercent × OrderTotal
    // — a share with no Amount yet (Prorab hasn't approved it) contributes 0,
    // same "not final until confirmed" spirit as ClosedPeriodsOnlyNote below.
    private static async Task<decimal> ComputePieceworkCostAsync(IApplicationDbContext context, Guid objectId, CancellationToken cancellationToken)
    {
        return await (
            from share in context.WorkOrderPayoutShares.AsNoTracking()
            join order in context.WorkOrders.AsNoTracking() on share.WorkOrderId equals order.Id
            where order.ObjectId == objectId && share.Amount != null
                  && (order.Status == WorkOrderStatus.Accepted || order.Status == WorkOrderStatus.Closed)
                  && order.CompletedDate != null
                  && context.PayrollEntries.AsNoTracking().Any(p => p.WorkerId == share.WorkerId
                      && p.Status == PayrollEntryStatus.Paid && p.PeriodStart <= order.CompletedDate && p.PeriodEnd >= order.CompletedDate)
            select share.Amount!.Value).SumAsync(x => (decimal?)x, cancellationToken) ?? 0m;
    }

    // §8.10: "Hourly — пропорционально часам: Timesheet.ObjectId +
    // HoursWorked за период -> доля рабочего на каждый объект" (direct
    // attribution, each Timesheet already carries its own ObjectId) +
    // "Оплачиваемое отсутствие — раскладывается пропорционально часам
    // этого рабочего за период" (absence has no ObjectId at all, so it's
    // genuinely split by this object's share of the worker's total hours
    // that period). Both need the same "which periods are Paid for this
    // worker" walk, so computed together in one pass over PayrollEntries.
    private static async Task<(decimal HourlyCost, decimal AbsenceCost)> ComputeHourlyAndAbsenceCostAsync(
        IApplicationDbContext context, Guid objectId, CancellationToken cancellationToken)
    {
        var paidEntries = await context.PayrollEntries.AsNoTracking()
            .Where(p => p.Status == PayrollEntryStatus.Paid)
            .ToListAsync(cancellationToken);

        if (paidEntries.Count == 0)
            return (0m, 0m);

        var workerIds = paidEntries.Select(p => p.WorkerId).Distinct().ToArray();
        var periodStart = paidEntries.Min(p => p.PeriodStart).AddMonths(-3);
        var periodEnd = paidEntries.Max(p => p.PeriodEnd);
        var timesheets = await context.Timesheets.AsNoTracking()
            .Where(t => workerIds.Contains(t.WorkerId) && t.Date >= periodStart && t.Date <= periodEnd
                && t.ApprovedAt != null && t.HoursWorked != null)
            .ToListAsync(cancellationToken);
        var absences = await context.AbsenceRecords.AsNoTracking()
            .Where(a => workerIds.Contains(a.WorkerId) && a.IsPaid && a.DateFrom <= periodEnd && a.DateTo >= periodStart)
            .ToListAsync(cancellationToken);
        var rates = await context.WorkerPayRateHistories.AsNoTracking()
            .Where(r => workerIds.Contains(r.WorkerId) && r.EffectiveFrom <= periodEnd)
            .OrderBy(r => r.EffectiveFrom).ToListAsync(cancellationToken);

        decimal hourlyCost = 0;
        decimal absenceCost = 0;

        foreach (var entry in paidEntries)
        {
            var timesheetsInPeriod = timesheets.Where(t => t.WorkerId == entry.WorkerId
                && t.Date >= entry.PeriodStart && t.Date <= entry.PeriodEnd).ToList();

            var totalHours = timesheetsInPeriod.Sum(t => t.HoursWorked!.Value);
            var thisObjectHours = timesheetsInPeriod.Where(t => t.ObjectId == objectId).Sum(t => t.HoursWorked!.Value);

            hourlyCost += timesheetsInPeriod.Where(t => t.ObjectId == objectId).Sum(t =>
            {
                var rate = rates.LastOrDefault(r => r.WorkerId == entry.WorkerId && r.EffectiveFrom <= t.Date);
                return rate?.PayRateType == PayRateType.Hourly ? t.HoursWorked!.Value * rate.PayRate : 0m;
            });

            // No hours anywhere this period -> nothing to weight the
            // absence split by; skipped rather than guessing at a
            // fallback MASTER doesn't specify.
            if (totalHours <= 0 || thisObjectHours <= 0)
                continue;

            var absenceDays = absences.Where(a => a.WorkerId == entry.WorkerId && a.DateFrom <= entry.PeriodEnd && a.DateTo >= entry.PeriodStart)
                .Sum(a => (a.DateTo < entry.PeriodEnd ? a.DateTo : entry.PeriodEnd).DayNumber - (a.DateFrom > entry.PeriodStart ? a.DateFrom : entry.PeriodStart).DayNumber + 1);
            var recent = timesheets.Where(t => t.WorkerId == entry.WorkerId && t.Date > entry.PeriodEnd.AddMonths(-3) && t.Date <= entry.PeriodEnd).ToList();
            var asOfRate = rates.LastOrDefault(r => r.WorkerId == entry.WorkerId && r.EffectiveFrom <= entry.PeriodEnd);
            var averageDailyRate = asOfRate?.PayRateType == PayRateType.Hourly
                ? recent.Count < 10 ? 8m * asOfRate.PayRate : recent.Sum(t =>
                    (rates.LastOrDefault(r => r.WorkerId == entry.WorkerId && r.EffectiveFrom <= t.Date)?.PayRate ?? 0m) * t.HoursWorked!.Value) / recent.Count
                : 0m;
            var absenceAmount = absenceDays * averageDailyRate;
            if (absenceAmount == 0)
                continue;

            absenceCost += absenceAmount * (thisObjectHours / totalHours);
        }

        return (hourlyCost, absenceCost);
    }
}
