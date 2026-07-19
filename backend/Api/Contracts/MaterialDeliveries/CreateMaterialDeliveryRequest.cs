namespace Api.Contracts.MaterialDeliveries;

public sealed record CreateMaterialDeliveryRequest(
    Guid ObjectId,
    Guid? MaterialRequestId,
    string MaterialName,
    string Unit,
    decimal Qty,
    decimal UnitCost,
    string? SupplierName);
