using Domain.Entities;
using Domain.Enums;

namespace Application.Workers;

// MASTER §11.6 (Document*) + §12 role matrix ("Worker | ... | CRU (без
// PayRate) | ... | R (с PayRate)"): Owner/Accountant see everything: Prorab
// never sees PayRate at all, and sees Document* masked. Masking happens here,
// server-side, at the Response DTO layer — never left to the client.
public sealed record WorkerDto(
    Guid Id,
    Guid BrigadeId,
    Guid? UserId,
    string FullName,
    string Phone,
    DateOnly BirthDate,
    string? Specialty,
    PayRateType PayRateType,
    decimal? PayRate,
    TimeOnly? ShiftStartTime,
    string? DocumentType,
    DateOnly? DocumentExpiryDate,
    DateOnly HireDate,
    DateOnly? TerminationDate,
    bool IsActive)
{
    public static WorkerDto FromEntity(Worker worker, Role? callerRole)
    {
        // Owner/Accountant see everything. Every other role (Prorab today;
        // Brigadir has no access to this endpoint at all, per §9.4) gets
        // PayRate hidden entirely and Document* masked.
        var seesFullDetails = callerRole is Role.Owner or Role.Accountant;

        return new WorkerDto(
            worker.Id,
            worker.BrigadeId,
            worker.UserId,
            worker.FullName,
            worker.Phone,
            worker.BirthDate,
            worker.Specialty,
            worker.PayRateType,
            seesFullDetails ? worker.PayRate : null,
            worker.ShiftStartTime,
            seesFullDetails ? worker.DocumentType : null,
            seesFullDetails ? worker.DocumentExpiryDate : null,
            worker.HireDate,
            worker.TerminationDate,
            worker.IsActive);
    }
}
