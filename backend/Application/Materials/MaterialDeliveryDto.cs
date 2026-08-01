using Domain.Entities;

namespace Application.Materials;

public sealed record MaterialDeliveryDto(
    Guid Id,
    Guid ObjectId,
    string ObjectName,
    Guid? MaterialRequestId,
    Guid? DocumentId,
    string MaterialName,
    string Unit,
    decimal Qty,
    decimal UnitCost,
    string? SupplierName,
    DateTimeOffset DeliveredAt)
{
    public static MaterialDeliveryDto FromEntity(MaterialDelivery delivery, string objectName) => new(
        delivery.Id,
        delivery.ObjectId,
        objectName,
        delivery.MaterialRequestId,
        delivery.DocumentId,
        delivery.MaterialName,
        delivery.Unit,
        delivery.Qty,
        delivery.UnitCost,
        delivery.SupplierName,
        delivery.DeliveredAt);
}
