using Application.Common.Interfaces;
using Application.Payroll;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// MASTER §8.10/§9.4: GET /objects/{id}/cost-breakdown — Prorab+. A pure
// read-model query, not stored anywhere ("иначе денормализация, которая
// разъедется при любой правке задним числом"). Fixes the pre-existing bug
// §8.10 calls out: "факт" used to be materials + WorkOrder totals WITHOUT
// payroll, understating true cost by the entire wage bill.
//
// "Зарплата учтена только за закрытые периоды (PayrollEntry.Status =
// Paid)" — an open month isn't in the fact, on purpose, so the number
// doesn't jump every day; that's what Note communicates back to the
// caller rather than silently showing a number that looks final but
// isn't.
public sealed record GetObjectCostBreakdownQuery(Guid ObjectId) : IRequest<Result<ObjectCostBreakdownDto>>;

public sealed class GetObjectCostBreakdownQueryValidator : AbstractValidator<GetObjectCostBreakdownQuery>
{
    public GetObjectCostBreakdownQueryValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
    }
}

public sealed class GetObjectCostBreakdownQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetObjectCostBreakdownQuery, Result<ObjectCostBreakdownDto>>
{
    private const string ClosedPeriodsOnlyNote = "Зарплата учтена только за закрытые периоды (PayrollEntry.Status = Paid).";

    public async Task<Result<ObjectCostBreakdownDto>> Handle(GetObjectCostBreakdownQuery request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<ObjectCostBreakdownDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<ObjectCostBreakdownDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var materialCost = await context.MaterialDeliveries
            .Where(d => d.ObjectId == request.ObjectId)
            .SumAsync(d => (decimal?)(d.UnitCost * d.Qty), cancellationToken) ?? 0m;

        var pieceworkCost = await ComputePieceworkCostAsync(request.ObjectId, cancellationToken);
        var (hourlyCost, absenceCost) = await ComputeHourlyAndAbsenceCostAsync(request.ObjectId, cancellationToken);

        var totalCost = materialCost + pieceworkCost + hourlyCost + absenceCost;

        return Result.Success(new ObjectCostBreakdownDto(
            request.ObjectId, materialCost, pieceworkCost, hourlyCost, absenceCost, totalCost, ClosedPeriodsOnlyNote));
    }

    // §8.10: "Piecework — прямо: WorkOrderPayoutShare.Amount ->
    // WorkOrder.ObjectId. Точно, без допущений." Reads the Amount snapshot
    // WorkOrderPayoutShare.Approve() sets (WorkOrderPayoutShares zone, merge
    // Step 3) directly, rather than recomputing from SharePercent × OrderTotal
    // — a share with no Amount yet (Prorab hasn't approved it) contributes 0,
    // same "not final until confirmed" spirit as ClosedPeriodsOnlyNote below.
    private async Task<decimal> ComputePieceworkCostAsync(Guid objectId, CancellationToken cancellationToken)
    {
        var orders = await context.WorkOrders
            .Where(w => w.ObjectId == objectId
                        && (w.Status == WorkOrderStatus.Accepted || w.Status == WorkOrderStatus.Closed)
                        && w.CompletedDate != null)
            .ToListAsync(cancellationToken);

        decimal total = 0;
        foreach (var order in orders)
        {
            var shares = await context.WorkOrderPayoutShares
                .Where(s => s.WorkOrderId == order.Id && s.Amount != null)
                .ToListAsync(cancellationToken);

            foreach (var share in shares)
            {
                var isPaid = await context.PayrollEntries.AnyAsync(
                    p => p.WorkerId == share.WorkerId
                         && p.Status == PayrollEntryStatus.Paid
                         && p.PeriodStart <= order.CompletedDate && p.PeriodEnd >= order.CompletedDate,
                    cancellationToken);
                if (!isPaid)
                    continue;

                total += share.Amount!.Value;
            }
        }

        return total;
    }

    // §8.10: "Hourly — пропорционально часам: Timesheet.ObjectId +
    // HoursWorked за период -> доля рабочего на каждый объект" (direct
    // attribution, each Timesheet already carries its own ObjectId) +
    // "Оплачиваемое отсутствие — раскладывается пропорционально часам
    // этого рабочего за период" (absence has no ObjectId at all, so it's
    // genuinely split by this object's share of the worker's total hours
    // that period). Both need the same "which periods are Paid for this
    // worker" walk, so computed together in one pass over PayrollEntries.
    private async Task<(decimal HourlyCost, decimal AbsenceCost)> ComputeHourlyAndAbsenceCostAsync(Guid objectId, CancellationToken cancellationToken)
    {
        var paidEntries = await context.PayrollEntries
            .Where(p => p.Status == PayrollEntryStatus.Paid)
            .ToListAsync(cancellationToken);

        decimal hourlyCost = 0;
        decimal absenceCost = 0;

        foreach (var entry in paidEntries)
        {
            var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == entry.WorkerId, cancellationToken);
            if (worker is null)
                continue;

            var timesheetsInPeriod = await context.Timesheets
                .Where(t => t.WorkerId == worker.Id
                            && t.Date >= entry.PeriodStart && t.Date <= entry.PeriodEnd
                            && t.ApprovedAt != null && t.HoursWorked != null)
                .ToListAsync(cancellationToken);

            var totalHours = timesheetsInPeriod.Sum(t => t.HoursWorked!.Value);
            var thisObjectHours = timesheetsInPeriod.Where(t => t.ObjectId == objectId).Sum(t => t.HoursWorked!.Value);

            if (worker.PayRateType == PayRateType.Hourly && thisObjectHours > 0)
                hourlyCost += thisObjectHours * worker.PayRate;

            // No hours anywhere this period -> nothing to weight the
            // absence split by; skipped rather than guessing at a
            // fallback MASTER doesn't specify.
            if (totalHours <= 0 || thisObjectHours <= 0)
                continue;

            var absenceAmount = await CalculatedAmountCalculator.ComputePaidAbsenceAmountAsync(
                context, worker, entry.PeriodStart, entry.PeriodEnd, cancellationToken);
            if (absenceAmount == 0)
                continue;

            absenceCost += absenceAmount * (thisObjectHours / totalHours);
        }

        return (hourlyCost, absenceCost);
    }
}
