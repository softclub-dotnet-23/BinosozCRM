namespace Api.Contracts.Objects;

public sealed record CreateEstimateItemRequest(
    string WorkType,
    string Unit,
    decimal PlannedQty,
    decimal PlannedUnitPrice,
    string? Stage);
