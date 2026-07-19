namespace Api.Contracts.Payroll;

public sealed record CreatePayrollEntryRequest(Guid WorkerId, DateOnly PeriodStart, DateOnly PeriodEnd);
