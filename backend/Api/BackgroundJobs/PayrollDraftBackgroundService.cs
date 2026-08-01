using Application.Payroll;
using Application.Common.Interfaces;
using Api.BackgroundServices;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.BackgroundJobs;

// MASTER stack table: "Hangfire (или BackgroundService) — ... черновики
// зарплаты". First background job in this project — no Hangfire
// infrastructure exists (no job storage tables, no dashboard), so a plain
// BackgroundService was the smaller addition; explicit choice, see
// PROGRESS.md Phase 5 Step 8. A thin timer loop only — all the actual
// logic (period math, which workers, alerting) lives in
// PayrollDraftGenerator (Application layer), directly unit-testable
// without waiting on this loop or the hosting lifecycle. After its startup
// run, this service waits for the next Asia/Dushanbe business-day boundary,
// never the host machine's local midnight.
public sealed class PayrollDraftBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<PayrollDraftBackgroundService> logger,
    IBusinessTimeProvider businessTime) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // MASTER §11.8: "алерт на упавшую фоновую задачу" — the
                // whole run failed (e.g. DB unreachable), not just one
                // worker's draft; PayrollDraftGenerator already logs
                // per-worker failures itself.
                logger.LogError(ex, "Payroll draft background job run failed.");
            }

            var now = businessTime.UtcNow;
            var delay = businessTime.GetNextBusinessDayStartUtc(now) - now;
            await Task.Delay(delay, stoppingToken);
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var jobLock = scope.ServiceProvider.GetRequiredService<IDistributedJobLock>();
        await using var heldLock = await jobLock.TryAcquireAsync("brigadacrm:payroll-draft", cancellationToken);
        if (heldLock is null)
        {
            logger.LogInformation("Payroll draft background job skipped because another replica holds the lock.");
            return;
        }
        var dbOptions = scope.ServiceProvider.GetRequiredService<DbContextOptions<ApplicationDbContext>>();
        var today = businessTime.Today;

        List<Company> companies;
        await using (var lookupContext = new ApplicationDbContext(dbOptions, new SystemCompanyCurrentUserService(Guid.Empty)))
        {
            companies = await lookupContext.Companies.ToListAsync(cancellationToken);
        }

        foreach (var company in companies)
        {
            try
            {
                await using var context = new ApplicationDbContext(dbOptions, new SystemCompanyCurrentUserService(company.Id));
                await PayrollDraftGenerator.GenerateForCompanyAsync(
                    context, company, today, businessTime, logger, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Payroll draft generation failed for company {CompanyId}", company.Id);
            }
        }
    }
}
