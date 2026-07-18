using Application.Common.Interfaces;
using Application.Common.Notifications;
using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs;

public sealed class SignalRRealtimeNotifier(IHubContext<WorkOrdersHub> hubContext) : IRealtimeNotifier
{
    public async Task NotifyWorkOrderStatusChangedAsync(
        Guid companyId, Guid brigadeId, WorkOrderStatusChangedNotification notification, CancellationToken cancellationToken)
    {
        // Company group covers Owner/Prorab/Accountant; Brigade group covers
        // Brigadir. Sent to both rather than picking one — neither group
        // alone reaches every role that should see this.
        await hubContext.Clients.Group(WorkOrderHubGroups.Company(companyId))
            .SendAsync("WorkOrderStatusChanged", notification, cancellationToken);
        await hubContext.Clients.Group(WorkOrderHubGroups.Brigade(brigadeId))
            .SendAsync("WorkOrderStatusChanged", notification, cancellationToken);
    }
}
