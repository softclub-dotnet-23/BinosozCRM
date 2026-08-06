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
    DateTimeOffset? DeliveredAt,
    string? Comment,
    bool IsOverDelivered)
{
    // MASTER §9.2: MATERIAL_REQUEST_OVERDELIVERY is explicitly "200, не
    // ошибка — предупреждение в UI". With no web panel, this DTO field is
    // the warning — the caller (bot/script) decides how to surface it.
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
        request.DeliveredAt,
        request.Comment,
        request.QtyDelivered > request.Qty);
}
