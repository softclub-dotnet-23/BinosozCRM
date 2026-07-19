namespace Api.Contracts.MaterialRequests;

public sealed record CreateMaterialRequestRequest(Guid ObjectId, string MaterialName, string Unit, decimal Qty);
