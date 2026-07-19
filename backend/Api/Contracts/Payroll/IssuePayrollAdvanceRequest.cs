namespace Api.Contracts.Payroll;

public sealed record IssuePayrollAdvanceRequest(Guid WorkerId, decimal Amount, string? Note);
