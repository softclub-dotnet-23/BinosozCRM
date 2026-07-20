using Application.Common.Interfaces;
using Application.Payroll;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.BackgroundServices;

// A minimal per-company "actor" for background DbContext access — no
// HttpContext exists here, so the DI-registered CurrentUserService (which
// reads claims off the current request) can't supply a CompanyId. This
// stands in for it directly, one instance per company per run.
internal sealed class SystemCompanyCurrentUserService(Guid companyId) : ICurrentUserService
{
    public Guid? UserId => null;
    public Guid? CompanyId => companyId;
    public Role? Role => null;
}

// MASTER §11.8/§2: "Фон: Hangfire (или BackgroundService) — ... черновики
// зарплаты" + "алерт на упавшую фоновую задачу (черновик зарплаты не
// сформировался = бухгалтер не заметит до конца месяца)." Built as a
// plain BackgroundService, not Hangfire — no job-persistence/dashboard
// package exists in this codebase yet, and pulling one in is an
// infrastructure decision bigger than this single step; §2's own table
// lists BackgroundService as the explicit alternative.
//
// Checks once every 24h (PeriodicTimer, not calendar-aligned to midnight —
// a real cron-style scheduler is exactly what Hangfire would buy over
// this). Each tick: for every Company whose PayrollPeriodType just closed
// yesterday, check whether any PayrollEntry exists for that period at
// all; if not, log at Error (the "алерт" — this codebase's Serilog sinks
// are the alerting surface, wiring that log to PagerDuty/Slack/etc. is
// ops configuration, not backend code) and then generate the draft
// anyway, self-healing rather than just complaining. A thrown exception
// from generation is caught and logged per-company, never crashing the
// host or blocking the remaining companies in the same run.
public sealed class PayrollDraftBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<PayrollDraftBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        do
        {
            await RunOnceAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbOptions = scope.ServiceProvider.GetRequiredService<DbContextOptions<ApplicationDbContext>>();

        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

        List<Company> companies;
        // Company isn't ICompanyOwned, so no CompanyId query filter ever
        // applies to it — the placeholder actor here is never consulted.
        await using (var lookupContext = new ApplicationDbContext(dbOptions, new SystemCompanyCurrentUserService(Guid.Empty)))
        {
            companies = await lookupContext.Companies.ToListAsync(cancellationToken);
        }

        foreach (var company in companies)
        {
            if (!PayrollPeriodCalculator.IsPeriodEnd(yesterday, company.PayrollPeriodType))
                continue;

            var (periodStart, periodEnd) = PayrollPeriodCalculator.GetPeriodContaining(yesterday, company.PayrollPeriodType);

            try
            {
                await using var context = new ApplicationDbContext(dbOptions, new SystemCompanyCurrentUserService(company.Id));

                var alreadyExists = await context.PayrollEntries.AnyAsync(
                    p => p.PeriodStart == periodStart && p.PeriodEnd == periodEnd, cancellationToken);

                if (!alreadyExists)
                {
                    logger.LogError(
                        "Payroll draft has not been generated for company {CompanyId}, period {PeriodStart:yyyy-MM-dd}..{PeriodEnd:yyyy-MM-dd} as of {CheckedAt}",
                        company.Id, periodStart, periodEnd, DateTimeOffset.UtcNow);
                }

                var handler = new GeneratePayrollDraftCommandHandler(context);
                await handler.Handle(new GeneratePayrollDraftCommand(periodStart, periodEnd), cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Payroll draft generation failed for company {CompanyId}, period {PeriodStart:yyyy-MM-dd}..{PeriodEnd:yyyy-MM-dd}",
                    company.Id, periodStart, periodEnd);
            }
        }
    }
}
