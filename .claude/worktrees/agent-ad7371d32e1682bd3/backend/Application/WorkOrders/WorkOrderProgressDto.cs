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
    // PhotoUrls here are freshly-signed, expiring URLs (§11.9) — the entity
    // itself only stores opaque keys; the signature is minted at read time,
    // not persisted.
    public static WorkOrderProgressDto FromEntity(WorkOrderProgress progress, IFileStorageService fileStorage) => new(
        progress.Id,
        progress.WorkOrderId,
        progress.ReportedByUserId,
        progress.ReportedQty,
        progress.PhotoUrls.Select(fileStorage.GetSignedUrl).ToList(),
        progress.Comment,
        progress.ReportedAt);
}
