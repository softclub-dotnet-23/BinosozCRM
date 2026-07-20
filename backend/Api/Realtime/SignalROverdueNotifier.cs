using Api.Hubs;
using Application.Common.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Api.Realtime;

public sealed class SignalROverdueNotifier(IHubContext<WorkOrdersHub> hubContext) : IOverdueNotifier
{
    public Task NotifyWorkOrderOverdueAsync(Guid companyId, Guid workOrderId, Guid brigadeId, DateOnly dueDate, CancellationToken cancellationToken) =>
        hubContext.Clients
            .Group(WorkOrdersHub.CompanyGroupPrefix + companyId)
            .SendAsync("WorkOrderOverdue", new { workOrderId, brigadeId, dueDate }, cancellationToken);

    public Task NotifyIndividualTaskOverdueAsync(Guid companyId, Guid taskId, Guid brigadeId, DateTimeOffset dueAt, CancellationToken cancellationToken) =>
        hubContext.Clients
            .Group(WorkOrdersHub.CompanyGroupPrefix + companyId)
            .SendAsync("IndividualTaskOverdue", new { taskId, brigadeId, dueAt }, cancellationToken);
}
