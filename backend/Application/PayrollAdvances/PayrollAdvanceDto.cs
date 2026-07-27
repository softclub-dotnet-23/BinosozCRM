using Domain.Entities;

namespace Application.PayrollAdvances;

public sealed record PayrollAdvanceDto(
    Guid Id,
    Guid WorkerId,
    decimal Amount,
    DateTimeOffset IssuedAt,
    Guid IssuedByUserId,
    string? Note,
    Guid? SettledInPayrollEntryId)
{
    public static PayrollAdvanceDto FromEntity(PayrollAdvance advance) => new(
        advance.Id,
        advance.WorkerId,
        advance.Amount,
        advance.IssuedAt,
        advance.IssuedByUserId,
        advance.Note,
        advance.SettledInPayrollEntryId);
}
