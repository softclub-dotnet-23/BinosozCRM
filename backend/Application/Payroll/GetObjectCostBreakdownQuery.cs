using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.10: ObjectActualCost = Σ MaterialDelivery(UnitCost × Qty) +
// Σ PayrollAllocation. §9.4 names this `GET /objects/{id}/cost-breakdown`
// — an /objects/ route, Zone A's controller — but the team-split doc §4
// already resolves this exact coordination point explicitly ("A вызывает
// готовые query B, не пишет свою версию расчёта"): this query is the
// "готовая query", built here; whoever builds ObjectsController's route
// (Ahmad, a Zone A step not reached yet) calls it, doesn't reimplement it.
// Not wired to any endpoint yet — that wiring is Zone A's, tracked as a
// dependency in PROGRESS.md rather than assumed done.
public sealed record GetObjectCostBreakdownQuery(Guid ObjectId) : IRequest<Result<ObjectCostBreakdownDto>>;

public sealed class GetObjectCostBreakdownQueryValidator : AbstractValidator<GetObjectCostBreakdownQuery>
{
    public GetObjectCostBreakdownQueryValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
    }
}

public sealed class GetObjectCostBreakdownQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetObjectCostBreakdownQuery, Result<ObjectCostBreakdownDto>>
{
    public async Task<Result<ObjectCostBreakdownDto>> Handle(GetObjectCostBreakdownQuery request, CancellationToken cancellationToken)
    {
        var objectExists = await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken);
        if (!objectExists)
            return Result.Failure<ObjectCostBreakdownDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var materialsCost = await context.MaterialDeliveries
            .Where(d => d.ObjectId == request.ObjectId)
            .SumAsync(d => (decimal?)(d.UnitCost * d.Qty), cancellationToken) ?? 0m;

        var pieceworkCost = await CalculatePieceworkAllocationAsync(request.ObjectId, cancellationToken);
        var hourlyCost = await CalculateHourlyAllocationAsync(request.ObjectId, cancellationToken);
        var payrollCost = pieceworkCost + hourlyCost;

        return Result.Success(new ObjectCostBreakdownDto(request.ObjectId, materialsCost, payrollCost, materialsCost + payrollCost));
    }

    // MASTER §8.10 Piecework: "прямо: WorkOrderPayoutShare.Amount ->
    // WorkOrder.ObjectId. Точно, без допущений" — the confirmed snapshot
    // amount (set at Prorab approval, Phase 5 Step 1), not recomputed the
    // way CreatePayrollEntryCommand's own Piecework calc does; here the
    // point is "what was actually confirmed for this object", not a live
    // recalculation. Only counted once the covering PayrollEntry is Paid.
    private async Task<decimal> CalculatePieceworkAllocationAsync(Guid objectId, CancellationToken cancellationToken)
    {
        var confirmedShares = await context.WorkOrderPayoutShares
            .Where(s => s.Amount != null)
            .Join(
                context.WorkOrders.Where(w => w.ObjectId == objectId && w.CompletedDate != null),
                s => s.WorkOrderId, w => w.Id, (s, w) => new { s.WorkerId, Amount = s.Amount!.Value, CompletedDate = w.CompletedDate!.Value })
            .ToListAsync(cancellationToken);

        decimal total = 0;
        foreach (var share in confirmedShares)
        {
            var isPaid = await context.PayrollEntries.AnyAsync(
                e => e.WorkerId == share.WorkerId && e.PeriodStart <= share.CompletedDate && e.PeriodEnd >= share.CompletedDate
                     && e.Status == PayrollEntryStatus.Paid,
                cancellationToken);

            if (isPaid)
                total += share.Amount;
        }

        return total;
    }

    // MASTER §8.10 Hourly: "пропорционально часам: Timesheet.ObjectId +
    // HoursWorked за период -> доля рабочего на каждый объект", plus
    // "Оплачиваемое отсутствие -> раскладывается пропорционально часам
    // этого рабочего за период" — read together, the whole Paid
    // PayrollEntry.CalculatedAmount for the period (worked hours *and*
    // its paid-absence add-on) is split across objects by each object's
    // share of the worker's total worked hours that period. Interpretation,
    // flagged: a worker with zero worked hours in a Paid period (entirely
    // paid absence) has nothing to allocate against and is skipped — MASTER
    // doesn't cover this edge case.
    private async Task<decimal> CalculateHourlyAllocationAsync(Guid objectId, CancellationToken cancellationToken)
    {
        var hourlyWorkerIds = await context.Timesheets
            .Where(t => t.ObjectId == objectId)
            .Join(context.Workers.Where(w => w.PayRateType == PayRateType.Hourly), t => t.WorkerId, w => w.Id, (t, w) => w.Id)
            .Distinct()
            .ToListAsync(cancellationToken);

        decimal total = 0;
        foreach (var workerId in hourlyWorkerIds)
        {
            var paidEntries = await context.PayrollEntries
                .Where(e => e.WorkerId == workerId && e.Status == PayrollEntryStatus.Paid)
                .ToListAsync(cancellationToken);

            foreach (var entry in paidEntries)
            {
                var periodTimesheets = await context.Timesheets
                    .Where(t => t.WorkerId == workerId && t.Date >= entry.PeriodStart && t.Date <= entry.PeriodEnd && t.HoursWorked != null)
                    .Select(t => new { t.ObjectId, HoursWorked = t.HoursWorked!.Value })
                    .ToListAsync(cancellationToken);

                var totalHours = periodTimesheets.Sum(t => t.HoursWorked);
                if (totalHours <= 0)
                    continue;

                var hoursOnThisObject = periodTimesheets.Where(t => t.ObjectId == objectId).Sum(t => t.HoursWorked);
                total += entry.CalculatedAmount * (hoursOnThisObject / totalHours);
            }
        }

        return total;
    }
}
