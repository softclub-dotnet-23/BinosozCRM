namespace Application.Common.Interfaces;

// MASTER §9.4: "события — после SaveChanges, не до." This interface carries
// no transactional guarantee by itself — every caller is responsible for
// only invoking it once the triggering SaveChangesAsync has actually
// completed, never before or interleaved with it.
public interface IWorkOrderRealtimeNotifier
{
    Task NotifyStatusChangedAsync(
        Guid companyId,
        Guid workOrderId,
        string fromStatus,
        string toStatus,
        CancellationToken cancellationToken);
}
