using Domain.Entities;
using Domain.Enums;

namespace Application.IndividualTasks;

public sealed record IndividualTaskDto(
    Guid Id,
    string Code,
    Guid? WorkOrderId,
    Guid BrigadeId,
    Guid AssignedToWorkerId,
    string Title,
    string? Description,
    DateTimeOffset? DueAt,
    IndividualTaskStatus Status,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    bool? CompletedEarly,
    Guid CreatedByUserId)
{
    public static IndividualTaskDto FromEntity(IndividualTask task) => new(
        task.Id,
        task.Code,
        task.WorkOrderId,
        task.BrigadeId,
        task.AssignedToWorkerId,
        task.Title,
        task.Description,
        task.DueAt,
        task.Status,
        task.StartedAt,
        task.CompletedAt,
        task.CompletedEarly,
        task.CreatedByUserId);
}
