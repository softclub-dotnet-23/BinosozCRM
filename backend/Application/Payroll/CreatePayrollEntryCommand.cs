using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.0 — the base salary figure everything else in Phase 5 adjusts.
// §9.4 names only `POST /payroll` (no separate recalculate endpoint), and
// PayrollEntry(WorkerId, PeriodStart, PeriodEnd) is UNIQUE (§6) — so this is
// an upsert: first call for a (Worker, Period) creates the Draft, a later
// call recomputes CalculatedAmount in place (e.g. a Timesheet gets approved
// late, after the first draft). Rejected once the entry has moved past
// Draft — PayrollEntry.UpdateDraft() already enforces that.
// LatenessDeductionAmount/BonusAmount/AdvanceDeductedAmount are 0 here —
// Steps 4/5/6 will retrofit this same handler to compute and pass them,
// same pattern as TerminateWorkerCommand/ListBrigadeWorkersQuery being
// retrofitted across steps (see PROGRESS.md Phase 3 Step 3).
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

        var updateResult = entry.UpdateDraft(calculatedAmount, latenessDeductionAmount: 0, bonusAmount: 0, advanceDeductedAmount: 0);
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
}
