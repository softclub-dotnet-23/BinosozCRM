using Domain.Entities;
using Domain.Enums;

namespace Application.Workers;

public sealed record WorkerDto(
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
    bool IsActive)
{
    public static WorkerDto FromEntity(Worker worker) => new(
        worker.Id,
        worker.BrigadeId,
        worker.UserId,
        worker.FullName,
        worker.Phone,
        worker.BirthDate,
        worker.Specialty,
        worker.PayRateType,
        worker.PayRate,
        worker.ShiftStartTime,
        worker.DocumentType,
        worker.DocumentExpiryDate,
        worker.HireDate,
        worker.TerminationDate,
        worker.IsActive);
}
