using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class PayrollEntry : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid WorkerId { get; private set; }
    public DateOnly PeriodStart { get; private set; }
    public DateOnly PeriodEnd { get; private set; }
    public decimal CalculatedAmount { get; private set; }
    public decimal LatenessDeductionAmount { get; private set; }
    public decimal BonusAmount { get; private set; }
    public decimal AdvanceDeductedAmount { get; private set; }
    public decimal AdjustmentAmount { get; private set; }
    public string? AdjustmentReason { get; private set; }
    public decimal? FinalAmount { get; private set; }
    public PayrollEntryStatus Status { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }
    public bool IsDeleted { get; set; }

    private PayrollEntry() { }

    public static PayrollEntry Create(Guid companyId, Guid workerId, DateOnly periodStart, DateOnly periodEnd)
    {
        return new PayrollEntry
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            WorkerId = workerId,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            Status = PayrollEntryStatus.Draft
        };
    }

    public Result UpdateDraft(
        decimal calculatedAmount,
        decimal latenessDeductionAmount,
        decimal bonusAmount,
        decimal advanceDeductedAmount)
    {
        if (Status != PayrollEntryStatus.Draft)
            return Result.Failure(new Error("PAYROLL_ENTRY_NOT_DRAFT", "Only a Draft payroll entry can be recalculated."));

        CalculatedAmount = calculatedAmount;
        LatenessDeductionAmount = latenessDeductionAmount;
        BonusAmount = bonusAmount;
        AdvanceDeductedAmount = advanceDeductedAmount;
        return Result.Success();
    }

    public Result Adjust(decimal adjustmentAmount, string adjustmentReason)
    {
        if (Status != PayrollEntryStatus.Draft)
            return Result.Failure(new Error("PAYROLL_ENTRY_NOT_DRAFT", "Only a Draft payroll entry can be adjusted."));

        AdjustmentAmount = adjustmentAmount;
        AdjustmentReason = adjustmentReason;
        return Result.Success();
    }

    public Result Approve()
    {
        if (Status != PayrollEntryStatus.Draft)
            return Result.Failure(new Error("PAYROLL_ENTRY_INVALID_TRANSITION", "Only a Draft payroll entry can be approved."));

        FinalAmount = CalculatedAmount - LatenessDeductionAmount + BonusAmount - AdvanceDeductedAmount + AdjustmentAmount;
        Status = PayrollEntryStatus.Approved;
        return Result.Success();
    }

    public Result Pay(DateTimeOffset paidAt)
    {
        if (Status != PayrollEntryStatus.Approved)
            return Result.Failure(new Error("PAYROLL_ENTRY_INVALID_TRANSITION", "Only an Approved payroll entry can be paid."));

        Status = PayrollEntryStatus.Paid;
        PaidAt = paidAt;
        return Result.Success();
    }
}
