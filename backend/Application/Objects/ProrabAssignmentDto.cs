using Domain.Entities;

namespace Application.Objects;

public sealed record ProrabAssignmentDto(Guid Id, Guid ObjectId, Guid ProrabUserId, DateTimeOffset AssignedAt, Guid AssignedByUserId)
{
    public static ProrabAssignmentDto FromEntity(ProrabObjectAssignment assignment) => new(
        assignment.Id,
        assignment.ObjectId,
        assignment.ProrabUserId,
        assignment.AssignedAt,
        assignment.AssignedByUserId);
}
