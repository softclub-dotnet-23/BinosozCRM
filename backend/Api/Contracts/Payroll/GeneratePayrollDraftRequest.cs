namespace Api.Contracts.Payroll;

public sealed record GeneratePayrollDraftRequest(DateOnly PeriodStart, DateOnly PeriodEnd);
