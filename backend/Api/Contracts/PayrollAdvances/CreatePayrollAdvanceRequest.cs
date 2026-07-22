namespace Api.Contracts.PayrollAdvances;

public sealed record CreatePayrollAdvanceRequest(Guid WorkerId, decimal Amount, string? Note);
