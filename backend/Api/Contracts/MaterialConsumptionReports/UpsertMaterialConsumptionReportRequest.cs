namespace Api.Contracts.MaterialConsumptionReports;

public sealed record UpsertMaterialConsumptionReportRequest(
    Guid ObjectId,
    string MaterialName,
    string Unit,
    decimal QtyUsed,
    decimal QtyShortage,
    string? Comment);
