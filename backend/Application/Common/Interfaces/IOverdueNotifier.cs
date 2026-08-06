namespace Application.Common.Interfaces;

// MASTER §2/§8.6: overdue is already defined identically to the dashboard
// (§8.6 — DueDate/DueAt in the past, status not final) — this just fires
// a real-time event the moment an item crosses that line, on top of the
// same background-job pattern as PayrollDraftBackgroundService (Phase 5
// Step 8). Telegram delivery/routing (§10.3, "маршрутизация по
// TelegramLink") is its own deferred [BOT] step (Phase 6 Step 3) — this
// interface only raises the event, it doesn't decide who reads it.
public interface IOverdueNotifier
{
    Task NotifyWorkOrderOverdueAsync(Guid companyId, Guid workOrderId, Guid brigadeId, DateOnly dueDate, CancellationToken cancellationToken);

    Task NotifyIndividualTaskOverdueAsync(Guid companyId, Guid taskId, Guid brigadeId, DateTimeOffset dueAt, CancellationToken cancellationToken);
}
