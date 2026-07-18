namespace Api.Contracts.IndividualTasks;

public sealed record CreateIndividualTaskRequest(
    Guid AssignedToWorkerId,
    string Title,
    string? Description,
    Guid? WorkOrderId,
    DateTimeOffset? DueAt);
