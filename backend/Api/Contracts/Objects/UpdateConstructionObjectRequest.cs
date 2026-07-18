using Domain.Enums;

namespace Api.Contracts.Objects;

public sealed record UpdateConstructionObjectRequest(
    string Name,
    string? Address,
    ConstructionObjectStatus Status,
    DateOnly? StartDate,
    DateOnly? PlannedEndDate,
    DateOnly? ActualEndDate,
    decimal? Budget);
