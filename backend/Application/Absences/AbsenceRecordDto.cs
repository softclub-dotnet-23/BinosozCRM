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
    public static AbsenceRecordDto FromEntity(AbsenceRecord record) => new(
        record.Id,
        record.WorkerId,
        record.DateFrom,
        record.DateTo,
        record.Type,
        record.Reason,
        record.IsPaid,
        record.DocumentUrl,
        record.ApprovedByUserId);
}
