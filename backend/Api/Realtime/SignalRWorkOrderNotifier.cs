using Api.Hubs;
using Application.Common.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Api.Realtime;

public sealed class SignalRWorkOrderNotifier(IHubContext<WorkOrdersHub> hubContext) : IWorkOrderRealtimeNotifier
{
    public Task NotifyStatusChangedAsync(
        Guid companyId,
        Guid workOrderId,
        string fromStatus,
        string toStatus,
        CancellationToken cancellationToken) =>
        hubContext.Clients
            .Group(WorkOrdersHub.CompanyGroupPrefix + companyId)
            .SendAsync("WorkOrderStatusChanged", new { workOrderId, fromStatus, toStatus }, cancellationToken);
}
