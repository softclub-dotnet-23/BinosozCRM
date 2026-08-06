using Api.Hubs;
using Application.Common.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Api.Realtime;

public sealed class SignalRMaterialShortageNotifier(IHubContext<WorkOrdersHub> hubContext) : IMaterialShortageNotifier
{
    public Task NotifyShortageAsync(
        Guid companyId,
        Guid reportId,
        Guid objectId,
        Guid brigadeId,
        string materialName,
        decimal qtyShortage,
        CancellationToken cancellationToken) =>
        hubContext.Clients
            .Group(WorkOrdersHub.CompanyGroupPrefix + companyId)
            .SendAsync("MaterialShortageReported", new { reportId, objectId, brigadeId, materialName, qtyShortage }, cancellationToken);
}
