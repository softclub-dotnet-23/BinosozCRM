namespace Api.Contracts.Payroll;

public sealed record ApprovePayrollEntryRequest(decimal? AdjustmentAmount, string? AdjustmentReason);
