namespace Api.Contracts.Materials;

public sealed record MaterialDeliveryDocumentLineRequest(string MaterialName, string Unit, decimal Qty, decimal UnitCost);

public sealed record CreateMaterialDeliveryDocumentRequest(
    Guid ObjectId,
    string? SupplierName,
    IReadOnlyList<MaterialDeliveryDocumentLineRequest> Items);
