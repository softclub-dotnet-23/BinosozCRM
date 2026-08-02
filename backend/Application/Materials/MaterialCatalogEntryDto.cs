namespace Application.Materials;

public sealed record MaterialCatalogEntryDto(
    string MaterialName,
    string Unit,
    decimal LastUnitCost,
    int DeliveryCount);
