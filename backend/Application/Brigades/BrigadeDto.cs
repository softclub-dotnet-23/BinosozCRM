using Domain.Entities;

namespace Application.Brigades;

// BrigadirFullName is resolved only by GetMyBrigadeQuery (a Worker-dashboard
// checkpoint addition, docs/PROGRESS.md) — every other caller of FromEntity
// doesn't need it and leaves it null rather than paying for an extra join.
public sealed record BrigadeDto(Guid Id, string Name, Guid? BrigadirUserId, bool IsActive, string? BrigadirFullName = null)
{
    public static BrigadeDto FromEntity(Brigade brigade, string? brigadirFullName = null) => new(
        brigade.Id,
        brigade.Name,
        brigade.BrigadirUserId,
        brigade.IsActive,
        brigadirFullName);
}
