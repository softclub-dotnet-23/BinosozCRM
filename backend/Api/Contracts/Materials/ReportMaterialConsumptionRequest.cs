namespace Api.Contracts.Materials;

public sealed record ReportMaterialConsumptionRequest(
    Guid ObjectId,
    DateOnly Date,
    string MaterialName,
    string Unit,
    decimal QtyUsed,
    decimal QtyShortage,
    string? Comment);
