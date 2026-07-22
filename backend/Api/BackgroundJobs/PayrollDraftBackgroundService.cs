using Application.Payroll;

namespace Api.BackgroundJobs;

// MASTER stack table: "Hangfire (или BackgroundService) — ... черновики
// зарплаты". First background job in this project — no Hangfire
// infrastructure exists (no job storage tables, no dashboard), so a plain
// BackgroundService was the smaller addition; explicit choice, see
// PROGRESS.md Phase 5 Step 8. A thin timer loop only — all the actual
// logic (period math, which workers, alerting) lives in
// PayrollDraftGenerator (Application layer), directly unit-testable
// without waiting on this loop or the hosting lifecycle.
public sealed class PayrollDraftBackgroundService(IServiceScopeFactory scopeFactory, ILogger<PayrollDraftBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var generator = scope.ServiceProvider.GetRequiredService<PayrollDraftGenerator>();
                await generator.GenerateForMostRecentlyEndedPeriodsAsync(DateOnly.FromDateTime(DateTime.UtcNow), stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // MASTER §11.8: "алерт на упавшую фоновую задачу" — the
                // whole run failed (e.g. DB unreachable), not just one
                // worker's draft; PayrollDraftGenerator already logs
                // per-worker failures itself.
                logger.LogError(ex, "Payroll draft background job run failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
