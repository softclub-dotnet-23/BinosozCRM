using Domain.Entities;

namespace Application.Brigades;

public sealed record BrigadeDto(Guid Id, string Name, Guid? BrigadirUserId, bool IsActive)
{
    public static BrigadeDto FromEntity(Brigade brigade) => new(
        brigade.Id,
        brigade.Name,
        brigade.BrigadirUserId,
        brigade.IsActive);
}
