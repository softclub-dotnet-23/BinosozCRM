using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.8: FinalAmount = CalculatedAmount - LatenessDeductionAmount +
// BonusAmount - AdvanceDeductedAmount ± AdjustmentAmount — already exactly
// what PayrollEntry.Approve() computes (Domain, Phase 0); this command is
// the missing caller plus §8.8's other Approve-time requirement: "каждому
// учтённому авансу проставляется SettledInPayrollEntryId". A negative
// FinalAmount is valid (an advance that outran what was earned) and is
// never clamped to zero — Approve() already doesn't touch it beyond the
// subtraction itself.
public sealed record ApprovePayrollEntryCommand(Guid PayrollEntryId) : IRequest<Result<PayrollEntryDto>>;

public sealed class ApprovePayrollEntryCommandValidator : AbstractValidator<ApprovePayrollEntryCommand>
{
    public ApprovePayrollEntryCommandValidator()
    {
        RuleFor(x => x.PayrollEntryId).NotEmpty();
    }
}

public sealed class ApprovePayrollEntryCommandHandler(IApplicationDbContext context)
    : IRequestHandler<ApprovePayrollEntryCommand, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(ApprovePayrollEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await context.PayrollEntries.FirstOrDefaultAsync(e => e.Id == request.PayrollEntryId, cancellationToken);
        if (entry is null)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_FOUND", "Payroll entry not found."));

        // §9.2's dedicated code for "правка после Paid" — Approve()'s own
        // guard would reject this too, but as the generic
        // PAYROLL_ENTRY_INVALID_TRANSITION, not the specific catalog entry.
        if (entry.Status == PayrollEntryStatus.Paid)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ALREADY_PAID", "This payroll entry has already been paid."));

        // Same filter CreatePayrollEntryCommand used to compute
        // AdvanceDeductedAmount. If a new advance was issued (or another
        // entry raced to settle one) since the entry's own AdvanceDeductedAmount
        // was last computed, the two sums diverge — approving now would
        // lock in a FinalAmount that no longer matches reality. Reject and
        // ask for a fresh POST /payroll instead of silently approving stale
        // numbers.
        var periodEndExclusiveUtc = new DateTimeOffset(entry.PeriodEnd.AddDays(1), TimeOnly.MinValue, TimeSpan.Zero);
        var unsettledAdvances = await context.PayrollAdvances
            .Where(a => a.WorkerId == entry.WorkerId && a.SettledInPayrollEntryId == null && a.IssuedAt < periodEndExclusiveUtc)
            .ToListAsync(cancellationToken);

        if (unsettledAdvances.Sum(a => a.Amount) != entry.AdvanceDeductedAmount)
            return Result.Failure<PayrollEntryDto>(new Error(
                "PAYROLL_ENTRY_RECALCULATION_REQUIRED",
                "Unsettled advances have changed since this draft was last calculated — recalculate via POST /payroll before approving."));

        var approveResult = entry.Approve();
        if (approveResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(approveResult.Error);

        foreach (var advance in unsettledAdvances)
            advance.Settle(entry.Id);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
