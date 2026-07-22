using Application.Common.Interfaces;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Payroll;

// MASTER §11.8: "черновик зарплаты не сформировался = бухгалтер не заметит
// до конца месяца" — so this is deliberately self-healing rather than
// firing only on the exact period-boundary day. Every run recomputes
// whichever period most recently ended (always well-defined, regardless
// of what day "today" happens to be) and upserts a Draft for every active
// worker in it via the same CreatePayrollEntryCommand every manual
// POST /payroll call uses — a missed run (server down on the boundary
// day) is caught by the next run instead of silently skipping that period
// forever. Reuses the command's own idempotency: an already-Approved/Paid
// entry for that period just rejects cleanly (PAYROLL_ENTRY_NOT_DRAFT,
// treated as expected here, not logged as a failure); any other failure
// is the "упавшая фоновая задача" this section's own alerting bullet
// means — logged at Error so it surfaces on whatever monitoring reads
// Serilog output (no push/paging channel exists in this project yet,
// same scope Phase 6 Step 7's own "мониторинг" step is left to build).
public sealed class PayrollDraftGenerator(IApplicationDbContext context, ISender sender, ILogger<PayrollDraftGenerator> logger)
{
    public async Task GenerateForMostRecentlyEndedPeriodsAsync(DateOnly today, CancellationToken cancellationToken)
    {
        var companies = await context.Companies.ToListAsync(cancellationToken);

        foreach (var company in companies)
        {
            var (periodStart, periodEnd) = GetMostRecentlyEndedPeriod(today, company.PayrollPeriodType);

            var workerIds = await context.Workers
                .Where(w => w.CompanyId == company.Id && w.IsActive)
                .Select(w => w.Id)
                .ToListAsync(cancellationToken);

            foreach (var workerId in workerIds)
            {
                var result = await sender.Send(new CreatePayrollEntryCommand(workerId, periodStart, periodEnd), cancellationToken);
                if (result.IsFailure && result.Error.Code != "PAYROLL_ENTRY_NOT_DRAFT")
                {
                    logger.LogError(
                        "Payroll draft generation failed for Worker {WorkerId}, period {PeriodStart}-{PeriodEnd}: {ErrorCode}",
                        workerId, periodStart, periodEnd, result.Error.Code);
                }
            }
        }
    }

    // Monthly: the period before the one "today" currently falls in.
    // SemiMonthly: 1st-15th and 16th-end-of-month — the standard split;
    // MASTER doesn't spell out the exact day boundary for this enum value,
    // flagged as the one interpretive default in this step.
    public static (DateOnly Start, DateOnly End) GetMostRecentlyEndedPeriod(DateOnly today, PayrollPeriodType periodType)
    {
        var currentPeriodStart = periodType switch
        {
            PayrollPeriodType.SemiMonthly when today.Day > 15 => new DateOnly(today.Year, today.Month, 16),
            _ => new DateOnly(today.Year, today.Month, 1)
        };

        var previousPeriodEnd = currentPeriodStart.AddDays(-1);
        var previousPeriodStart = periodType switch
        {
            PayrollPeriodType.SemiMonthly when previousPeriodEnd.Day > 15 => new DateOnly(previousPeriodEnd.Year, previousPeriodEnd.Month, 16),
            _ => new DateOnly(previousPeriodEnd.Year, previousPeriodEnd.Month, 1)
        };

        return (previousPeriodStart, previousPeriodEnd);
    }
}
