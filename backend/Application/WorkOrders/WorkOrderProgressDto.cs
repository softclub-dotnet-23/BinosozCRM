using Application.Common.Interfaces;
using Domain.Entities;

namespace Application.WorkOrders;

public sealed record WorkOrderProgressDto(
    Guid Id,
    Guid WorkOrderId,
    Guid ReportedByUserId,
    decimal ReportedQty,
    IReadOnlyList<string> PhotoUrls,
    string? Comment,
    DateTimeOffset ReportedAt)
{
    // Signed URLs are minted fresh on every read (photoStorage.GenerateSignedDownloadUrl),
    // not stored — a signed URL baked into the DB would go dead once its
    // expiry passed, but the underlying storage key (what's actually
    // persisted in PhotoUrls) never expires. See IPhotoStorageService.
    public static WorkOrderProgressDto FromEntity(WorkOrderProgress progress, IPhotoStorageService photoStorage) => new(
        progress.Id,
        progress.WorkOrderId,
        progress.ReportedByUserId,
        progress.ReportedQty,
        progress.PhotoUrls.Select(photoStorage.GenerateSignedDownloadUrl).ToList(),
        progress.Comment,
        progress.ReportedAt);
}
