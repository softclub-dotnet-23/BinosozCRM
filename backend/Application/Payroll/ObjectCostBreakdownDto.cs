namespace Application.Payroll;

// MASTER §8.10: "показывается с явной пометкой" — Note carries that
// pометка so every caller (bot/script, no web panel) surfaces it, rather
// than a number with no context that later reads as wrong.
public sealed record ObjectCostBreakdownDto(
    Guid ObjectId,
    decimal MaterialsCost,
    decimal PayrollCost,
    decimal TotalCost,
    string Note = "Зарплата учтена только за закрытые периоды (PayrollEntry.Status = Paid).");
