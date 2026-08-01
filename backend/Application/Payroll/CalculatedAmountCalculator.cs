using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.0 — the single source of truth for CalculatedAmount, both
// branches. Everything here is read-only (no writes) so the same
// computation can be re-run idempotently every time a Draft payroll is
// (re)generated for a period.
internal static class CalculatedAmountCalculator
{
    public static async Task<decimal> ComputeAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly periodStart,
        DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        var baseAmount = worker.PayRateType == PayRateType.Hourly
            ? await ComputeHourlyAsync(context, worker, periodStart, periodEnd, cancellationToken)
            : await ComputePieceworkAsync(context, worker, periodStart, periodEnd, cancellationToken);

        var absenceAmount = await ComputePaidAbsenceAmountAsync(context, worker, periodStart, periodEnd, cancellationToken);

        return baseAmount + absenceAmount;
    }

    // Hourly: "Σ(Timesheet.HoursWorked × Worker.PayRate) за все дни
    // периода, где Timesheet.ApprovedAt IS NOT NULL" — an unapproved
    // timesheet contributes nothing; it just sits as "requires approval"
    // for the Prorab, per §8.0's own reasoning (a Brigadir alone can't
    // set both their own and everyone else's pay unchecked).
    private static async Task<decimal> ComputeHourlyAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly periodStart,
        DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        var approvedTimesheets = await context.Timesheets
            .Where(t => t.WorkerId == worker.Id
                        && t.Date >= periodStart && t.Date <= periodEnd
                        && t.ApprovedAt != null
                        && t.HoursWorked != null)
            .ToListAsync(cancellationToken);

        return approvedTimesheets.Sum(t => t.HoursWorked!.Value * worker.PayRate);
    }

    // Piecework: "Для каждого WorkOrder... CompletedDate ∈ период:
    // OrderTotal = Σ(WorkOrderProgress.ReportedQty) × WorkOrder.UnitPrice,
    // WorkerAmount = OrderTotal × (SharePercent / 100)." Driven from this
    // worker's own WorkOrderPayoutShare rows (Phase 5 Step 1) rather than
    // from WorkOrder.BrigadeId — the share itself is the authoritative
    // "this worker gets paid from this order" link, already isolated to
    // the order's own brigade at the point the share was set.
    private static async Task<decimal> ComputePieceworkAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly periodStart,
        DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        // One bounded query replaces the former 1 + (2 × share-count)
        // pattern. The grouped progress subquery retains the exact factual
        // quantity formula while keeping tenant query filters active.
        var amounts = await (
            from share in context.WorkOrderPayoutShares.AsNoTracking()
            join order in context.WorkOrders.AsNoTracking() on share.WorkOrderId equals order.Id
            where share.WorkerId == worker.Id
                  && (order.Status == WorkOrderStatus.Accepted || order.Status == WorkOrderStatus.Closed)
                  && order.CompletedDate != null
                  && order.CompletedDate >= periodStart && order.CompletedDate <= periodEnd
            join progress in context.WorkOrderProgresses.AsNoTracking() on order.Id equals progress.WorkOrderId into progresses
            select new
            {
                share.SharePercent,
                order.UnitPrice,
                ReportedQty = progresses.Sum(p => (decimal?)p.ReportedQty) ?? 0m
            }).ToListAsync(cancellationToken);

        return amounts.Sum(x => x.ReportedQty * x.UnitPrice * (x.SharePercent / 100m));
    }

    // "Оплачиваемое отсутствие: средняя дневная ставка = Σ HoursWorked за
    // последние 3 месяца / количество отработанных дней × PayRate. Если
    // истории <10 дней — 8ч × PayRate." Shared by both Hourly and
    // Piecework — the sentence appears identically in both subsections of
    // §8.0, so it isn't special-cased per PayRateType.
    // internal, not private: Phase 5 Step 9's cost-breakdown read model
    // reuses this exact total per (worker, period) before splitting it
    // across objects by hour-ratio — recomputing the same formula
    // separately would risk the two drifting apart.
    internal static async Task<decimal> ComputePaidAbsenceAmountAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly periodStart,
        DateOnly periodEnd,
        CancellationToken cancellationToken)
    {
        var paidAbsences = await context.AbsenceRecords
            .Where(a => a.WorkerId == worker.Id && a.IsPaid && a.DateFrom <= periodEnd && a.DateTo >= periodStart)
            .ToListAsync(cancellationToken);

        if (paidAbsences.Count == 0)
            return 0m;

        var paidAbsenceDays = paidAbsences.Sum(a =>
        {
            var overlapStart = a.DateFrom > periodStart ? a.DateFrom : periodStart;
            var overlapEnd = a.DateTo < periodEnd ? a.DateTo : periodEnd;
            return overlapEnd.DayNumber - overlapStart.DayNumber + 1;
        });

        var averageDailyRate = await ComputeAverageDailyRateAsync(context, worker, periodEnd, cancellationToken);
        return paidAbsenceDays * averageDailyRate;
    }

    private static async Task<decimal> ComputeAverageDailyRateAsync(
        IApplicationDbContext context,
        Worker worker,
        DateOnly asOf,
        CancellationToken cancellationToken)
    {
        var threeMonthsAgo = asOf.AddMonths(-3);

        var recentTimesheets = await context.Timesheets
            .Where(t => t.WorkerId == worker.Id
                        && t.Date > threeMonthsAgo && t.Date <= asOf
                        && t.ApprovedAt != null
                        && t.HoursWorked != null)
            .ToListAsync(cancellationToken);

        if (recentTimesheets.Count < 10)
            return 8m * worker.PayRate;

        var totalHours = recentTimesheets.Sum(t => t.HoursWorked!.Value);
        return (totalHours / recentTimesheets.Count) * worker.PayRate;
    }
}
