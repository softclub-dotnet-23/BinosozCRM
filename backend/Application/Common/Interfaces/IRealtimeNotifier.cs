using Application.Common.Notifications;

namespace Application.Common.Interfaces;

// MASTER §9.4: SignalR /hubs/work-orders — "группы из claims, никогда из
// клиентского ввода. События — после SaveChanges, не до." The interface
// keeps SignalR (an ASP.NET-specific, Api-layer technology, like IFormFile)
// out of Application; the real implementation lives in Api/Hubs.
public interface IRealtimeNotifier
{
    Task NotifyWorkOrderStatusChangedAsync(
        Guid companyId, Guid brigadeId, WorkOrderStatusChangedNotification notification, CancellationToken cancellationToken);
}
