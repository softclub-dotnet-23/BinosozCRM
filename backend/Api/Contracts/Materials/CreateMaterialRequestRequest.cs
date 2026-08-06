namespace Api.Contracts.Materials;

public sealed record CreateMaterialRequestRequest(Guid ObjectId, string MaterialName, string Unit, decimal Qty);
