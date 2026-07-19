using Domain.Entities;
using Domain.Enums;

namespace Application.Materials;

public sealed record MaterialRequestDto(
    Guid Id,
    Guid ObjectId,
    Guid BrigadeId,
    Guid RequestedByUserId,
    string MaterialName,
    string Unit,
    decimal Qty,
    decimal QtyDelivered,
    MaterialRequestStatus Status,
    Guid? ApprovedByUserId,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ApprovedAt,
    DateTimeOffset? DeliveredAt)
{
    public static MaterialRequestDto FromEntity(MaterialRequest request) => new(
        request.Id,
        request.ObjectId,
        request.BrigadeId,
        request.RequestedByUserId,
        request.MaterialName,
        request.Unit,
        request.Qty,
        request.QtyDelivered,
        request.Status,
        request.ApprovedByUserId,
        request.RequestedAt,
        request.ApprovedAt,
        request.DeliveredAt);
}
