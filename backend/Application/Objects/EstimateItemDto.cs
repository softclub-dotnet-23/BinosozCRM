using Domain.Entities;

namespace Application.Objects;

public sealed record EstimateItemDto(
    Guid Id,
    Guid ObjectId,
    string WorkType,
    string Unit,
    decimal PlannedQty,
    decimal PlannedUnitPrice,
    string? Stage)
{
    public static EstimateItemDto FromEntity(EstimateItem item) => new(
        item.Id,
        item.ObjectId,
        item.WorkType,
        item.Unit,
        item.PlannedQty,
        item.PlannedUnitPrice,
        item.Stage);
}
