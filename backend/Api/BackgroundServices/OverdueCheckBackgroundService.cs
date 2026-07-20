using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.BackgroundServices;

// MASTER §8.6/§2: overdue is defined identically to the dashboard's own
// definition (DueDate/DueAt in the past, status not final) — this job
// fires a real-time event the moment an item crosses that line, via
// IOverdueNotifier (SignalR today; §10.3's Telegram routing is Phase 6
// Step 3's job, deferred with every other [BOT] step). Same shape as
// PayrollDraftBackgroundService (Phase 5 Step 8): plain BackgroundService,
// per-company ApplicationDbContext built from a SystemCompanyCurrentUserService
// since no HttpContext exists here to supply CompanyId to the global
// query filter, exceptions caught and logged per-company rather than
// crashing the host.
//
// Checks once every 24h for items whose due date/time falls on
// *yesterday* specifically — DueDate/DueAt is a point in time, so "just
// became overdue" only happens once, on the day after it passes. Without
// persisting "already notified" state per item (a real field this
// codebase doesn't have), checking exactly yesterday is what keeps this
// from re-firing the same notification every single day an item stays
// overdue.
public sealed class OverdueCheckBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<OverdueCheckBackgroundService> logger) : BackgroundService
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
        var notifier = scope.ServiceProvider.GetRequiredService<IOverdueNotifier>();

        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

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
                await CheckCompanyAsync(context, notifier, company.Id, yesterday, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Overdue check failed for company {CompanyId}", company.Id);
            }
        }
    }

    // Public, not private: lets a test drive the actual query/notify
    // logic directly against a real ApplicationDbContext (any provider),
    // without needing to spin up IServiceScopeFactory/DI for the whole
    // background service — same reasoning as LocalFileStorageService
    // (Phase 2 Step 4) being public rather than internal.
    public static async Task CheckCompanyAsync(
        ApplicationDbContext context,
        IOverdueNotifier notifier,
        Guid companyId,
        DateOnly yesterday,
        CancellationToken cancellationToken)
    {
        var overdueWorkOrders = await context.WorkOrders
            .Where(w => w.DueDate == yesterday && w.Status != WorkOrderStatus.Accepted && w.Status != WorkOrderStatus.Closed)
            .ToListAsync(cancellationToken);

        foreach (var workOrder in overdueWorkOrders)
        {
            await notifier.NotifyWorkOrderOverdueAsync(
                companyId, workOrder.Id, workOrder.BrigadeId, workOrder.DueDate!.Value, cancellationToken);
        }

        var overdueIndividualTasks = await context.IndividualTasks
            .Where(t => t.DueAt != null && t.Status != IndividualTaskStatus.Done)
            .ToListAsync(cancellationToken);

        foreach (var task in overdueIndividualTasks.Where(t => DateOnly.FromDateTime(t.DueAt!.Value.UtcDateTime) == yesterday))
        {
            await notifier.NotifyIndividualTaskOverdueAsync(
                companyId, task.Id, task.BrigadeId, task.DueAt!.Value, cancellationToken);
        }
    }
}
