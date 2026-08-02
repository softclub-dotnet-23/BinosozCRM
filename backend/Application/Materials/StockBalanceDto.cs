namespace Application.Materials;

public sealed record StockBalanceDto(
    string MaterialName,
    string Unit,
    decimal TotalDelivered,
    decimal TotalConsumed,
    decimal Balance);
