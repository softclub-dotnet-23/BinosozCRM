using Domain.Enums;

namespace Api.Contracts.Workers;

public sealed record CreateWorkerRequest(
    string FullName,
    string Phone,
    DateOnly BirthDate,
    PayRateType PayRateType,
    decimal PayRate,
    DateOnly HireDate,
    Guid? UserId,
    string? Specialty,
    TimeOnly? ShiftStartTime,
    string? DocumentType,
    DateOnly? DocumentExpiryDate);
