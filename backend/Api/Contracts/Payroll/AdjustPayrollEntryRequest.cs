namespace Api.Contracts.Payroll;

public sealed record AdjustPayrollEntryRequest(decimal AdjustmentAmount, string? AdjustmentReason);
