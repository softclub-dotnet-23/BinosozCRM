using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Reports;

public sealed record ActualCostLineDto(
    Guid? ObjectId, string ObjectName, decimal MaterialCost, decimal PieceworkCost,
    decimal HourlyCost, decimal BonusAmount, decimal AdvanceDeductedAmount,
    decimal LatenessDeductionAmount, decimal AdjustmentAmount, decimal TotalCost);

public sealed record ActualCostReportDto(DateOnly PeriodStart, DateOnly PeriodEnd, IReadOnlyList<ActualCostLineDto> Lines, decimal TotalCost);

public sealed record GetActualCostReportQuery(DateOnly PeriodStart, DateOnly PeriodEnd) : IRequest<Result<ActualCostReportDto>>;

public sealed class GetActualCostReportQueryValidator : AbstractValidator<GetActualCostReportQuery>
{
    public GetActualCostReportQueryValidator()
    {
        RuleFor(x => x.PeriodStart).NotEmpty();
        RuleFor(x => x.PeriodEnd).NotEmpty().GreaterThanOrEqualTo(x => x.PeriodStart);
    }
}

public sealed class GetActualCostReportQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetActualCostReportQuery, Result<ActualCostReportDto>>
{
    private const string GeneralName = "Общие";

    public async Task<Result<ActualCostReportDto>> Handle(GetActualCostReportQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        var hasRestrictedObjectScope = allowedObjectIds is not null;
        var objects = await context.ConstructionObjects.AsNoTracking()
            .Where(o => allowedObjectIds == null || allowedObjectIds.Contains(o.Id))
            .Select(o => new { o.Id, o.Name })
            .ToListAsync(cancellationToken);
        var names = objects.ToDictionary(o => o.Id, o => o.Name);
        var lines = new Dictionary<Guid, Totals>();

        Totals For(Guid objectId) => lines.TryGetValue(objectId, out var total)
            ? total : lines[objectId] = new Totals();

        var startUtc = new DateTimeOffset(request.PeriodStart.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var endUtc = new DateTimeOffset(request.PeriodEnd.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var deliveries = await context.MaterialDeliveries.AsNoTracking()
            .Where(d => d.DeliveredAt >= startUtc && d.DeliveredAt < endUtc
                && (allowedObjectIds == null || allowedObjectIds.Contains(d.ObjectId)))
            .Select(d => new { d.ObjectId, Cost = d.Qty * d.UnitCost })
            .ToListAsync(cancellationToken);
        foreach (var delivery in deliveries)
            For(delivery.ObjectId).Material += delivery.Cost;

        // Paid entries are the immutable source of payroll facts. The report
        // deliberately takes complete paid periods only; it never invents a
        // partial-period allocation for an arbitrary date range.
        var entries = await context.PayrollEntries.AsNoTracking()
            .Where(p => p.Status == PayrollEntryStatus.Paid
                && p.PeriodStart >= request.PeriodStart && p.PeriodEnd <= request.PeriodEnd)
            .Select(p => new Entry(p.WorkerId, p.PeriodStart, p.PeriodEnd, p.CalculatedAmount, p.BonusAmount,
                p.AdvanceDeductedAmount, p.LatenessDeductionAmount, p.AdjustmentAmount))
            .ToListAsync(cancellationToken);
        if (entries.Count == 0)
            return Result.Success(ToDto(request, lines, names, new Totals()));

        var workerIds = entries.Select(e => e.WorkerId).Distinct().ToArray();
        var earliestEntryStart = entries.Min(e => e.PeriodStart);
        var latestEntryEnd = entries.Max(e => e.PeriodEnd);
        var timesheets = await context.Timesheets.AsNoTracking()
            // Three prior months are required for the paid-absence formula.
            .Where(t => workerIds.Contains(t.WorkerId) && t.Date >= earliestEntryStart.AddMonths(-3) && t.Date <= latestEntryEnd
                && t.ApprovedAt != null && t.HoursWorked != null)
            .Select(t => new Sheet(t.WorkerId, t.ObjectId, t.Date, t.HoursWorked!.Value))
            .ToListAsync(cancellationToken);
        var paidAbsences = await context.AbsenceRecords.AsNoTracking()
            .Where(a => workerIds.Contains(a.WorkerId) && a.IsPaid
                && a.DateFrom <= latestEntryEnd && a.DateTo >= earliestEntryStart)
            .Select(a => new Absence(a.WorkerId, a.DateFrom, a.DateTo))
            .ToListAsync(cancellationToken);
        var rates = await context.WorkerPayRateHistories.AsNoTracking()
            .Where(r => workerIds.Contains(r.WorkerId) && r.EffectiveFrom <= latestEntryEnd)
            .OrderBy(r => r.EffectiveFrom)
            .Select(r => new Rate(r.WorkerId, r.PayRateType, r.PayRate, r.EffectiveFrom))
            .ToListAsync(cancellationToken);
        var shares = await (
            from share in context.WorkOrderPayoutShares.AsNoTracking()
            join order in context.WorkOrders.AsNoTracking() on share.WorkOrderId equals order.Id
            where workerIds.Contains(share.WorkerId) && share.Amount != null && order.CompletedDate != null
                  && order.CompletedDate >= request.PeriodStart && order.CompletedDate <= request.PeriodEnd
                  && (order.Status == WorkOrderStatus.Accepted || order.Status == WorkOrderStatus.Closed)
            select new Share(share.WorkerId, order.ObjectId, order.CompletedDate!.Value, share.Amount!.Value))
            .ToListAsync(cancellationToken);

        var general = new Totals();
        foreach (var entry in entries)
        {
            var entryShares = shares.Where(s => s.WorkerId == entry.WorkerId
                && s.CompletedDate >= entry.PeriodStart && s.CompletedDate <= entry.PeriodEnd).ToList();
            foreach (var share in entryShares.Where(s => IsVisible(s.ObjectId, allowedObjectIds)))
                For(share.ObjectId).Piecework += share.Amount;

            // The full set of this worker's approved hours is the denominator.
            // Filtering it first would assign a Prorab the worker's complete
            // payroll when the worker also worked on a different object.
            var entrySheets = timesheets.Where(t => t.WorkerId == entry.WorkerId
                && t.Date >= entry.PeriodStart && t.Date <= entry.PeriodEnd).ToList();
            var totalHours = entrySheets.Sum(t => t.Hours);
            var hourlyAmount = entrySheets.Sum(sheet =>
            {
                var rate = GetRate(rates, entry.WorkerId, sheet.Date);
                return rate?.PayRateType == PayRateType.Hourly ? sheet.Hours * rate.PayRate : 0m;
            });
            var paidAbsenceAmount = ComputePaidAbsenceAmount(entry, paidAbsences, timesheets, rates);

            // Piecework is already a direct approved snapshot. For hourly work,
            // use the rate effective on the Timesheet date; never read the
            // mutable Worker.PayRate. A historical-data delta is kept on the
            // General line for an all-company report rather than allocated using
            // a rule the domain does not define.
            var unallocatedBaseAmount = entry.CalculatedAmount
                - entryShares.Sum(share => share.Amount)
                - hourlyAmount
                - paidAbsenceAmount;

            foreach (var sheet in entrySheets.Where(sheet => IsVisible(sheet.ObjectId, allowedObjectIds)))
            {
                var rate = GetRate(rates, entry.WorkerId, sheet.Date);
                if (rate?.PayRateType == PayRateType.Hourly)
                    For(sheet.ObjectId).Hourly += sheet.Hours * rate.PayRate;
            }

            if (totalHours <= 0)
            {
                // General is company-wide. It must never expose unallocated
                // payroll to a Prorab who has an explicit object allow-list.
                if (!hasRestrictedObjectScope)
                {
                    general.Hourly += paidAbsenceAmount + unallocatedBaseAmount;
                    general.Bonus += entry.Bonus;
                    general.Advance += entry.Advance;
                    general.Lateness += entry.Lateness;
                    general.Adjustment += entry.Adjustment;
                }
                continue;
            }

            AddProportional(entrySheets, totalHours, paidAbsenceAmount, allowedObjectIds, static (total, amount) => total.Hourly += amount);
            AddProportional(entrySheets, totalHours, entry.Bonus, allowedObjectIds, static (total, amount) => total.Bonus += amount);
            AddProportional(entrySheets, totalHours, entry.Advance, allowedObjectIds, static (total, amount) => total.Advance += amount);
            AddProportional(entrySheets, totalHours, entry.Lateness, allowedObjectIds, static (total, amount) => total.Lateness += amount);
            AddProportional(entrySheets, totalHours, entry.Adjustment, allowedObjectIds, static (total, amount) => total.Adjustment += amount);

            if (!hasRestrictedObjectScope)
                general.Hourly += unallocatedBaseAmount;
        }

        return Result.Success(ToDto(request, lines, names, general));

        void AddProportional(
            List<Sheet> sheets,
            decimal totalHours,
            decimal amount,
            List<Guid>? visibleObjectIds,
            Action<Totals, decimal> add)
        {
            if (amount == 0)
                return;

            var groups = sheets.GroupBy(sheet => sheet.ObjectId).OrderBy(group => group.Key).ToList();
            var allocated = 0m;
            for (var index = 0; index < groups.Count; index++)
            {
                var group = groups[index];
                // The final deterministic bucket gets the residual from any
                // recurring decimal division, preserving exact reconciliation.
                var allocation = index == groups.Count - 1
                    ? amount - allocated
                    : amount * group.Sum(sheet => sheet.Hours) / totalHours;
                allocated += allocation;

                if (IsVisible(group.Key, visibleObjectIds))
                    add(For(group.Key), allocation);
            }
        }
    }

    private static bool IsVisible(Guid objectId, List<Guid>? allowedObjectIds) =>
        allowedObjectIds is null || allowedObjectIds.Contains(objectId);

    private static Rate? GetRate(IReadOnlyList<Rate> rates, Guid workerId, DateOnly date) =>
        rates.LastOrDefault(rate => rate.WorkerId == workerId && rate.EffectiveFrom <= date);

    // Mirrors CalculatedAmountCalculator's paid-absence calculation using the
    // same effective-dated rate history, so a paid entry's base components can
    // be reconciled without consulting mutable worker state.
    private static decimal ComputePaidAbsenceAmount(
        Entry entry,
        IReadOnlyList<Absence> absences,
        IReadOnlyList<Sheet> timesheets,
        IReadOnlyList<Rate> rates)
    {
        var paidAbsenceDays = absences
            .Where(absence => absence.WorkerId == entry.WorkerId
                && absence.DateFrom <= entry.PeriodEnd && absence.DateTo >= entry.PeriodStart)
            .Sum(absence =>
            {
                var overlapStart = absence.DateFrom > entry.PeriodStart ? absence.DateFrom : entry.PeriodStart;
                var overlapEnd = absence.DateTo < entry.PeriodEnd ? absence.DateTo : entry.PeriodEnd;
                return overlapEnd.DayNumber - overlapStart.DayNumber + 1;
            });

        if (paidAbsenceDays == 0)
            return 0m;

        var asOfRate = GetRate(rates, entry.WorkerId, entry.PeriodEnd);
        if (asOfRate?.PayRateType != PayRateType.Hourly)
            return 0m;

        var recentSheets = timesheets.Where(sheet => sheet.WorkerId == entry.WorkerId
            && sheet.Date > entry.PeriodEnd.AddMonths(-3) && sheet.Date <= entry.PeriodEnd).ToList();
        if (recentSheets.Count < 10)
            return paidAbsenceDays * 8m * asOfRate.PayRate;

        var averageDailyRate = recentSheets.Sum(sheet =>
        {
            var rate = GetRate(rates, entry.WorkerId, sheet.Date);
            return rate?.PayRateType == PayRateType.Hourly ? sheet.Hours * rate.PayRate : 0m;
        }) / recentSheets.Count;
        return paidAbsenceDays * averageDailyRate;
    }

    private static ActualCostReportDto ToDto(
        GetActualCostReportQuery request,
        Dictionary<Guid, Totals> lines,
        Dictionary<Guid, string> names,
        Totals general)
    {
        var result = lines.OrderBy(x => names.GetValueOrDefault(x.Key, x.Key.ToString()))
            .Select(x => ToLine(x.Key, names.GetValueOrDefault(x.Key, x.Key.ToString()), x.Value))
            .ToList();
        if (!general.IsZero)
            result.Add(ToLine(null, GeneralName, general));
        return new ActualCostReportDto(request.PeriodStart, request.PeriodEnd, result, result.Sum(x => x.TotalCost));
    }

    private static ActualCostLineDto ToLine(Guid? id, string name, Totals t) => new(
        id, name, t.Material, t.Piecework, t.Hourly, t.Bonus, t.Advance, t.Lateness, t.Adjustment,
        t.Material + t.Piecework + t.Hourly + t.Bonus - t.Advance - t.Lateness + t.Adjustment);

    private sealed class Totals
    {
        public decimal Material;
        public decimal Piecework;
        public decimal Hourly;
        public decimal Bonus;
        public decimal Advance;
        public decimal Lateness;
        public decimal Adjustment;
        public bool IsZero => Material == 0 && Piecework == 0 && Hourly == 0 && Bonus == 0 && Advance == 0 && Lateness == 0 && Adjustment == 0;
    }

    private sealed record Entry(Guid WorkerId, DateOnly PeriodStart, DateOnly PeriodEnd, decimal CalculatedAmount, decimal Bonus, decimal Advance, decimal Lateness, decimal Adjustment);
    private sealed record Sheet(Guid WorkerId, Guid ObjectId, DateOnly Date, decimal Hours);
    private sealed record Share(Guid WorkerId, Guid ObjectId, DateOnly CompletedDate, decimal Amount);
    private sealed record Absence(Guid WorkerId, DateOnly DateFrom, DateOnly DateTo);
    private sealed record Rate(Guid WorkerId, PayRateType PayRateType, decimal PayRate, DateOnly EffectiveFrom);
}
