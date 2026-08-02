namespace Application.Objects;

public sealed record ObjectBudgetSummaryDto(
    Guid ObjectId,
    string ObjectName,
    decimal? Budget,
    decimal ActualCost,
    decimal? Remaining);
