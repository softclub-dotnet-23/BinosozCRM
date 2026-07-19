using Domain.Enums;

namespace Api.Contracts.Absences;

public sealed record CreateAbsenceRecordRequest(
    Guid WorkerId,
    DateOnly DateFrom,
    DateOnly DateTo,
    AbsenceType Type,
    bool IsPaid,
    string? Reason,
    string? DocumentUrl);
