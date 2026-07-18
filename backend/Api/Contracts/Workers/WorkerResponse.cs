using Domain.Enums;

namespace Api.Contracts.Workers;

// Full shape — Owner/Accountant per MASTER §12 (PayRate visible). Document*
// fields are NOT masked for Prorab either — decided explicitly for this step
// (PROGRESS.md, Phase 1 Step 6): §11.6's "masked document number" describes a
// field the actual Worker entity never had (only DocumentType/
// DocumentExpiryDate, no document number), so there's nothing left to mask
// there. WorkerProrabResponse is the only other shape — it differs solely by
// omitting PayRateType/PayRate.
public sealed record WorkerResponse(
    Guid Id,
    Guid BrigadeId,
    Guid? UserId,
    string FullName,
    string Phone,
    DateOnly BirthDate,
    string? Specialty,
    PayRateType PayRateType,
    decimal PayRate,
    TimeOnly? ShiftStartTime,
    string? DocumentType,
    DateOnly? DocumentExpiryDate,
    DateOnly HireDate,
    DateOnly? TerminationDate,
    bool IsActive);
