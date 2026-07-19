using Application.Common.Interfaces;
using Application.Common.Notifications;

namespace Api.IntegrationTests;

// Shared across test files that construct WorkOrder/MaterialConsumptionReport
// handlers — SignalR delivery itself isn't what these tests are checking
// (see PROGRESS.md, Phase 2 Step 5 / Phase 4 Step 4's own throwaway checks
// for that).
public sealed class NoOpRealtimeNotifier : IRealtimeNotifier
{
    public Task NotifyWorkOrderStatusChangedAsync(
        Guid companyId, Guid brigadeId, WorkOrderStatusChangedNotification notification, CancellationToken cancellationToken) =>
        Task.CompletedTask;

    public Task NotifyMaterialShortageReportedAsync(
        Guid companyId, MaterialShortageReportedNotification notification, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}
