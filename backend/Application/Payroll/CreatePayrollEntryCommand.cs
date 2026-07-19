using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.0/§8.1/§8.7/§8.8 — every UpdateDraft() component except
// AdjustmentAmount (Step 7's job, manual/Accountant-only, not computed).
// §9.4 names only `POST /payroll` (no separate recalculate endpoint), and
// PayrollEntry(WorkerId, PeriodStart, PeriodEnd) is UNIQUE (§6) — so this is
// an upsert: first call for a (Worker, Period) creates the Draft, a later
// call recomputes every amount in place (e.g. a Timesheet gets approved
// late, after the first draft). Rejected once the entry has moved past
// Draft — PayrollEntry.UpdateDraft() already enforces that.
public sealed record CreatePayrollEntryCommand(Guid WorkerId, DateOnly PeriodStart, DateOnly PeriodEnd)
    : IRequest<Result<PayrollEntryDto>>;

public sealed class CreatePayrollEntryCommandValidator : AbstractValidator<CreatePayrollEntryCommand>
{
    public CreatePayrollEntryCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.PeriodEnd).GreaterThanOrEqualTo(x => x.PeriodStart);
    }
}

public sealed class CreatePayrollEntryCommandHandler(IApplicationDbContext context)
    : IRequestHandler<CreatePayrollEntryCommand, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(CreatePayrollEntryCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure<PayrollEntryDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        var existingEntry = await context.PayrollEntries.FirstOrDefaultAsync(
            e => e.WorkerId == request.WorkerId && e.PeriodStart == request.PeriodStart && e.PeriodEnd == request.PeriodEnd,
            cancellationToken);

        var calculatedAmount = worker.PayRateType == PayRateType.Piecework
            ? await CalculatePieceworkAmountAsync(worker, request.PeriodStart, request.PeriodEnd, cancellationToken)
            : await CalculateHourlyAmountAsync(worker, request.PeriodStart, request.PeriodEnd, cancellationToken);

        calculatedAmount += await CalculatePaidAbsenceAmountAsync(worker, request.PeriodStart, request.PeriodEnd, cancellationToken);

        var latenessDeductionAmount = await CalculateLatenessDeductionAsync(worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var bonusAmount = await CalculateBonusAmountAsync(worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var advanceDeductedAmount = await CalculateAdvanceDeductedAmountAsync(worker, request.PeriodEnd, cancellationToken);

        PayrollEntry entry;
        if (existingEntry is null)
        {
            entry = PayrollEntry.Create(worker.CompanyId, worker.Id, request.PeriodStart, request.PeriodEnd);
            context.PayrollEntries.Add(entry);
        }
        else
        {
            entry = existingEntry;
        }

        var updateResult = entry.UpdateDraft(calculatedAmount, latenessDeductionAmount, bonusAmount, advanceDeductedAmount);
        if (updateResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(updateResult.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }

    // MASTER §8.0 Hourly: only Prorab-approved timesheets count.
    private async Task<decimal> CalculateHourlyAmountAsync(
        Worker worker, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var totalHours = await context.Timesheets
            .Where(t => t.WorkerId == worker.Id && t.Date >= periodStart && t.Date <= periodEnd && t.ApprovedAt != null)
            .SumAsync(t => (decimal?)(t.HoursWorked ?? 0), cancellationToken) ?? 0m;

        return totalHours * worker.PayRate;
    }

    // MASTER §8.0 Piecework: Σ ReportedQty (fact, not PlannedQty) per
    // WorkOrder in {Accepted, Closed} whose CompletedDate falls in the
    // period, times this worker's SharePercent — recomputed fresh from
    // current data, not read from WorkOrderPayoutShare.Amount (that field
    // is a snapshot taken at Prorab confirmation time, Phase 5 Step 1's
    // own concern; §8.0's formula is stated in terms of SharePercent
    // directly and doesn't reference it).
    private async Task<decimal> CalculatePieceworkAmountAsync(
        Worker worker, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var shares = await context.WorkOrderPayoutShares
            .Where(s => s.WorkerId == worker.Id)
            .Join(
                context.WorkOrders.Where(w =>
                    (w.Status == WorkOrderStatus.Accepted || w.Status == WorkOrderStatus.Closed)
                    && w.CompletedDate != null && w.CompletedDate >= periodStart && w.CompletedDate <= periodEnd),
                s => s.WorkOrderId, w => w.Id, (s, w) => new { WorkOrderId = w.Id, w.UnitPrice, s.SharePercent })
            .ToListAsync(cancellationToken);

        decimal total = 0;
        foreach (var share in shares)
        {
            var reportedQty = await context.WorkOrderProgresses
                .Where(p => p.WorkOrderId == share.WorkOrderId)
                .SumAsync(p => (decimal?)p.ReportedQty, cancellationToken) ?? 0m;

            var orderTotal = reportedQty * share.UnitPrice;
            total += orderTotal * share.SharePercent / 100m;
        }

        return total;
    }

    // MASTER §8.0: paid absence days × average daily rate, added on top of
    // either pay type. Average daily rate = (Σ HoursWorked over the last 3
    // months / worked days) × PayRate, falling back to 8h × PayRate under
    // 10 days of history. Interpretation, flagged: "last 3 months" is
    // anchored at PeriodEnd (the period being calculated), not "today" —
    // re-running this for a past period should reproduce the same number.
    // The lookback also requires ApprovedAt IS NOT NULL, same as the main
    // Hourly formula — not stated explicitly for this sub-formula, but
    // using unapproved (possibly disputed) timesheets to set someone's
    // paid-leave rate would be inconsistent with the rest of §8.0.
    private async Task<decimal> CalculatePaidAbsenceAmountAsync(
        Worker worker, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var paidAbsences = await context.AbsenceRecords
            .Where(a => a.WorkerId == worker.Id && a.IsPaid && a.DateFrom <= periodEnd && a.DateTo >= periodStart)
            .ToListAsync(cancellationToken);

        if (paidAbsences.Count == 0)
            return 0m;

        var paidDays = paidAbsences.Sum(a =>
        {
            var overlapStart = a.DateFrom > periodStart ? a.DateFrom : periodStart;
            var overlapEnd = a.DateTo < periodEnd ? a.DateTo : periodEnd;
            return overlapEnd >= overlapStart ? overlapEnd.DayNumber - overlapStart.DayNumber + 1 : 0;
        });

        if (paidDays == 0)
            return 0m;

        var lookbackStart = periodEnd.AddMonths(-3);
        var history = await context.Timesheets
            .Where(t => t.WorkerId == worker.Id && t.Date >= lookbackStart && t.Date <= periodEnd
                        && t.ApprovedAt != null && t.HoursWorked != null)
            .Select(t => t.HoursWorked!.Value)
            .ToListAsync(cancellationToken);

        var averageDailyHours = history.Count < 10 ? 8m : history.Sum() / history.Count;

        return paidDays * averageDailyHours * worker.PayRate;
    }

    // MASTER §8.1: LateMinutes is computed once at check-in (Timesheet.CheckIn,
    // grace period already applied there — Company.LatenessGraceMinutes at
    // that moment, a snapshot, same as PlannedStartTime) and never
    // recalculated; this just sums the already-final per-day values over
    // the period and applies the per-minute rate. Both worked examples in
    // §8.1 (65 min -> 43.33, 50 min -> 33.33) are minutes already net of
    // grace, confirming LateMinutes itself is not re-derived here.
    // Interpretation, flagged, same reasoning as the paid-absence lookback
    // above: restricted to ApprovedAt IS NOT NULL, even though §8.1 doesn't
    // say so as explicitly as §8.0's Hourly formula does — an unapproved
    // timesheet's lateness hasn't been verified by anyone either.
    private async Task<decimal> CalculateLatenessDeductionAsync(
        Worker worker, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var totalLateMinutes = await context.Timesheets
            .Where(t => t.WorkerId == worker.Id && t.Date >= periodStart && t.Date <= periodEnd && t.ApprovedAt != null)
            .SumAsync(t => t.LateMinutes, cancellationToken) ?? 0;

        return Math.Round(totalLateMinutes * worker.PayRate / 60m, 2, MidpointRounding.AwayFromZero);
    }

    // MASTER §8.7 point 5: "Подтверждённая -> PayrollEntry.BonusAmount
    // периода по CompletedAt" — only a bonus Prorab has actually confirmed
    // (BonusApprovedByUserId set) counts; a proposed-but-unconfirmed
    // BonusAmount "в зарплату не попадает" (point 3), so this deliberately
    // does NOT sum every IndividualTask.BonusAmount, only approved ones.
    // The confirm action itself (POST /individual-tasks/{id}/bonus/approve,
    // point 4/6 — Prorab confirms or changes the amount, never the
    // Brigadir for their own task) is IndividualTask's own endpoint —
    // Zone A territory (Application/IndividualTasks/), not built here;
    // flagged as "нужно от Ахмада" in PROGRESS.md. This only reads
    // whatever rows already carry a confirmed bonus, same as every other
    // Zone A table this handler already reads (WorkOrder, WorkOrderProgress,
    // WorkOrderPayoutShare).
    private async Task<decimal> CalculateBonusAmountAsync(
        Worker worker, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var periodStartUtc = new DateTimeOffset(periodStart, TimeOnly.MinValue, TimeSpan.Zero);
        var periodEndExclusiveUtc = new DateTimeOffset(periodEnd.AddDays(1), TimeOnly.MinValue, TimeSpan.Zero);

        return await context.IndividualTasks
            .Where(t => t.AssignedToWorkerId == worker.Id && t.BonusApprovedByUserId != null
                        && t.CompletedAt != null && t.CompletedAt >= periodStartUtc && t.CompletedAt < periodEndExclusiveUtc)
            .SumAsync(t => (decimal?)(t.BonusAmount ?? 0), cancellationToken) ?? 0m;
    }

    // MASTER §8.8: every still-unsettled advance issued on or before
    // PeriodEnd counts — deliberately no lower bound on IssuedAt, so an
    // old advance nobody's paid off yet keeps showing up period after
    // period until it's settled. An advance issued after PeriodEnd rolls
    // into the next period instead, satisfied by the same upper bound.
    // Marking SettledInPayrollEntryId happens at Approve time (Step 7),
    // not here — this is Draft-recalculation, which must stay idempotent
    // and re-runnable without side effects on PayrollAdvance rows.
    private async Task<decimal> CalculateAdvanceDeductedAmountAsync(
        Worker worker, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var periodEndExclusiveUtc = new DateTimeOffset(periodEnd.AddDays(1), TimeOnly.MinValue, TimeSpan.Zero);

        return await context.PayrollAdvances
            .Where(a => a.WorkerId == worker.Id && a.SettledInPayrollEntryId == null && a.IssuedAt < periodEndExclusiveUtc)
            .SumAsync(a => (decimal?)a.Amount, cancellationToken) ?? 0m;
    }
}
