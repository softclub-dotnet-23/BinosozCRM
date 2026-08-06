using Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Api.Contracts.Absences;

public sealed record CreateAbsenceRecordRequest(
    Guid WorkerId,
    DateOnly DateFrom,
    DateOnly DateTo,
    AbsenceType Type,
    bool IsPaid,
    string? Reason,
    IFormFile? Document);
