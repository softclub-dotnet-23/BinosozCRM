using Domain.Entities;
using Domain.Enums;

namespace Application.Objects;

public sealed record ConstructionObjectDto(
    Guid Id,
    string Name,
    string? Address,
    Guid CustomerId,
    ConstructionObjectStatus Status,
    DateOnly? StartDate,
    DateOnly? PlannedEndDate,
    DateOnly? ActualEndDate,
    decimal? Budget)
{
    public static ConstructionObjectDto FromEntity(ConstructionObject obj) => new(
        obj.Id,
        obj.Name,
        obj.Address,
        obj.CustomerId,
        obj.Status,
        obj.StartDate,
        obj.PlannedEndDate,
        obj.ActualEndDate,
        obj.Budget);
}
