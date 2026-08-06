using Domain.Entities;
using Domain.Enums;

namespace Application.Payroll;

public sealed record PayrollEntryDto(
    Guid Id,
    Guid WorkerId,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal CalculatedAmount,
    decimal LatenessDeductionAmount,
    decimal BonusAmount,
    decimal AdvanceDeductedAmount,
    decimal AdjustmentAmount,
    string? AdjustmentReason,
    decimal? FinalAmount,
    PayrollEntryStatus Status,
    DateTimeOffset? PaidAt)
{
    public static PayrollEntryDto FromEntity(PayrollEntry entry) => new(
        entry.Id,
        entry.WorkerId,
        entry.PeriodStart,
        entry.PeriodEnd,
        entry.CalculatedAmount,
        entry.LatenessDeductionAmount,
        entry.BonusAmount,
        entry.AdvanceDeductedAmount,
        entry.AdjustmentAmount,
        entry.AdjustmentReason,
        entry.FinalAmount,
        entry.Status,
        entry.PaidAt);
}
