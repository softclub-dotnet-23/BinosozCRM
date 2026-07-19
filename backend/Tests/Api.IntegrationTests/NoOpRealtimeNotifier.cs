using Application.Common.Interfaces;
using Application.Common.Notifications;

namespace Api.IntegrationTests;

// Shared across test files that construct WorkOrder transition handlers —
// SignalR delivery itself isn't what these tests are checking (see
// PROGRESS.md, Phase 2 Step 5's own throwaway check for that).
public sealed class NoOpRealtimeNotifier : IRealtimeNotifier
{
    public Task NotifyWorkOrderStatusChangedAsync(
        Guid companyId, Guid brigadeId, WorkOrderStatusChangedNotification notification, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}
