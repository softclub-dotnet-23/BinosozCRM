namespace Api.Contracts.Objects;

public sealed record CreateConstructionObjectRequest(
    string Name,
    Guid CustomerId,
    string? Address,
    DateOnly? StartDate,
    DateOnly? PlannedEndDate,
    decimal? Budget);
