using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §9.4/§8.8: POST /payroll/{id}/approve — Accountant, Owner.
// FinalAmount = CalculatedAmount - LatenessDeductionAmount + BonusAmount
// - AdvanceDeductedAmount + AdjustmentAmount, computed exactly once here
// by PayrollEntry.Approve() itself — "может быть отрицательным... это не
// ошибка расчёта," never clamped to zero.
//
// §9.4 has no separate "/adjust" endpoint, and PayrollEntry.Adjust() is
// Draft-only anyway (can't touch a number after Approve freezes it) — so
// an optional AdjustmentAmount/AdjustmentReason rides on this same call,
// applied via Adjust() immediately before Approve() in one transaction.
// §9.2's PAYROLL_ADJUSTMENT_REASON_REQUIRED fires when AdjustmentAmount
// != 0 with no reason.
//
// §8.8: "При Approve: каждому учтённому авансу проставляется
// SettledInPayrollEntryId" — every PayrollAdvance that fed this entry's
// AdvanceDeductedAmount (same criteria AdvanceDeductedAmountCalculator
// used at draft time) gets stamped with this entry's id in the same
// SaveChanges, so it stops counting toward any future period's draft.
public sealed record ApprovePayrollEntryCommand(Guid PayrollEntryId, decimal? AdjustmentAmount, string? AdjustmentReason)
    : IRequest<Result<PayrollEntryDto>>;

public sealed class ApprovePayrollEntryCommandValidator : AbstractValidator<ApprovePayrollEntryCommand>
{
    public ApprovePayrollEntryCommandValidator()
    {
        RuleFor(x => x.PayrollEntryId).NotEmpty();

        // The AdjustmentAmount != 0 -> AdjustmentReason required rule is
        // NOT a FluentValidation rule — ValidationBehavior hardcodes every
        // FluentValidation failure to the generic VALIDATION_FAILED code
        // regardless of WithErrorCode() (same gotcha as Phase 5 Step 1's
        // WORK_ORDER_SHARES_INVALID), but §9.2's catalog specifically
        // calls for PAYROLL_ADJUSTMENT_REASON_REQUIRED here. Checked
        // explicitly in the handler instead.
    }
}

public sealed class ApprovePayrollEntryCommandHandler(IApplicationDbContext context)
    : IRequestHandler<ApprovePayrollEntryCommand, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(ApprovePayrollEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await context.PayrollEntries.FirstOrDefaultAsync(p => p.Id == request.PayrollEntryId, cancellationToken);
        if (entry is null)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_FOUND", "Payroll entry not found."));

        if (entry.Status == PayrollEntryStatus.Paid)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ALREADY_PAID", "This payroll entry has already been paid."));

        // §9.2's FluentValidation rule already rejects a missing reason
        // for a nonzero amount — this is the code-level 400, not the
        // 400-with-generic-VALIDATION_FAILED path, since ValidationBehavior
        // hardcodes every FluentValidation failure to VALIDATION_FAILED
        // regardless of WithErrorCode() (same gotcha caught in Phase 5
        // Step 1). Re-checked explicitly here for that reason.
        if (request.AdjustmentAmount is not null && request.AdjustmentAmount != 0 && string.IsNullOrWhiteSpace(request.AdjustmentReason))
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ADJUSTMENT_REASON_REQUIRED", "AdjustmentReason is required when AdjustmentAmount is non-zero."));

        if (request.AdjustmentAmount is not null)
        {
            var adjustResult = entry.Adjust(request.AdjustmentAmount.Value, request.AdjustmentReason ?? string.Empty);
            if (adjustResult.IsFailure)
                return Result.Failure<PayrollEntryDto>(adjustResult.Error);
        }

        var approveResult = entry.Approve();
        if (approveResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(approveResult.Error);

        var periodEndBoundary = new DateTimeOffset(entry.PeriodEnd, TimeOnly.MaxValue, TimeSpan.Zero);
        var advancesToSettle = await context.PayrollAdvances
            .Where(a => a.WorkerId == entry.WorkerId && a.SettledInPayrollEntryId == null && a.IssuedAt <= periodEndBoundary)
            .ToListAsync(cancellationToken);

        foreach (var advance in advancesToSettle)
            advance.Settle(entry.Id);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
