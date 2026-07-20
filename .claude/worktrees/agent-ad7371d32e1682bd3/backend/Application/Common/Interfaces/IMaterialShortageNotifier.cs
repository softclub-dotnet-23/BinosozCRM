namespace Application.Common.Interfaces;

// MASTER §9.4/§8.2: "Одновременно — событие MaterialShortageReported
// прорабу сразу, не дожидаясь оформления заявки." Fires straight off a
// QtyShortage > 0 report, independent of whether a MaterialRequest ever
// gets filed for it — same "события после SaveChanges, не до" ordering
// rule as IWorkOrderRealtimeNotifier (Phase 2 Step 5).
public interface IMaterialShortageNotifier
{
    Task NotifyShortageAsync(
        Guid companyId,
        Guid reportId,
        Guid objectId,
        Guid brigadeId,
        string materialName,
        decimal qtyShortage,
        CancellationToken cancellationToken);
}
