using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Application.AbsenceRecords;

public sealed record AbsenceRecordDto(
    Guid Id,
    Guid WorkerId,
    DateOnly DateFrom,
    DateOnly DateTo,
    AbsenceType Type,
    string? Reason,
    bool IsPaid,
    string? DocumentUrl,
    Guid? ApprovedByUserId)
{
    // DocumentUrl in the DB is a storage key (§11.9 pattern — same as
    // WorkOrderProgress.PhotoUrls), not a literal URL; a fresh signed,
    // expiring download link is minted on every read instead of one baked
    // in permanently. Null passes through unchanged (no document attached).
    public static AbsenceRecordDto FromEntity(AbsenceRecord record, IPhotoStorageService photoStorage) => new(
        record.Id,
        record.WorkerId,
        record.DateFrom,
        record.DateTo,
        record.Type,
        record.Reason,
        record.IsPaid,
        record.DocumentUrl is null ? null : photoStorage.GenerateSignedDownloadUrl(record.DocumentUrl),
        record.ApprovedByUserId);
}
