using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Application.Absences;

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
    // MASTER §11.9: DocumentUrl in the DB is a stable storage key, not a
    // literal URL -- a signed URL saved permanently would go dead once its
    // expiry passed, so a fresh one is minted on every read instead, same
    // pattern as WorkOrderProgressDto.
    public static AbsenceRecordDto FromEntity(AbsenceRecord record, IFileStorageService fileStorage) => new(
        record.Id,
        record.WorkerId,
        record.DateFrom,
        record.DateTo,
        record.Type,
        record.Reason,
        record.IsPaid,
        record.DocumentUrl is null ? null : fileStorage.GetSignedUrl(record.DocumentUrl),
        record.ApprovedByUserId);
}
