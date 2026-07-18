namespace Api.Contracts.Workers;

// Prorab's shape — MASTER §12: Worker "CRU (без PayRate)". Differs from
// WorkerResponse only by omitting PayRateType/PayRate; see WorkerResponse
// for why Document* isn't masked here too.
public sealed record WorkerProrabResponse(
    Guid Id,
    Guid BrigadeId,
    Guid? UserId,
    string FullName,
    string Phone,
    DateOnly BirthDate,
    string? Specialty,
    TimeOnly? ShiftStartTime,
    string? DocumentType,
    DateOnly? DocumentExpiryDate,
    DateOnly HireDate,
    DateOnly? TerminationDate,
    bool IsActive);
