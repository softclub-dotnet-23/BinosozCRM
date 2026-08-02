using Domain.Enums;

namespace Application.Brigades;

public sealed record BrigadeAssignmentDto(
    Guid BrigadeId,
    string BrigadeName,
    Guid ObjectId,
    string ObjectName,
    string Title,
    decimal Amount,
    DateOnly? AssignedDate,
    DateOnly? DueDate,
    WorkOrderStatus Status);
