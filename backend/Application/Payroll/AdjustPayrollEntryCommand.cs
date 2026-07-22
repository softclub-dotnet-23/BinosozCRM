using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.8: "Бухгалтер решает — перенести на следующий период
// (AdjustmentAmount) или удержать. Нельзя молча занулить — человек должен
// видеть свой реальный баланс." §9.2's PAYROLL_ADJUSTMENT_REASON_REQUIRED
// ("AdjustmentAmount ≠ 0 без причины") has sat unreachable in the catalog
// since an earlier phase — wired up here. No §9.4-named endpoint for this
// (only Create/Approve/Pay are listed) — built anyway, same "state
// machine needs it, table doesn't name it" pattern as WorkOrder's
// Assign/Start/Close; PayrollEntry.Adjust() (Domain, Phase 0) has had no
// caller until now, and this is the real gap PROGRESS.md's own Step 11
// entry exists to close (found reviewing Step 7, see that write-up).
// Accountant-only per §12's literal "CRUA" — Owner is "RA" there, no "U".
public sealed record AdjustPayrollEntryCommand(Guid PayrollEntryId, decimal AdjustmentAmount, string? AdjustmentReason)
    : IRequest<Result<PayrollEntryDto>>;

public sealed class AdjustPayrollEntryCommandValidator : AbstractValidator<AdjustPayrollEntryCommand>
{
    public AdjustPayrollEntryCommandValidator()
    {
        RuleFor(x => x.PayrollEntryId).NotEmpty();
        RuleFor(x => x.AdjustmentReason).MaximumLength(1000);
    }
}

public sealed class AdjustPayrollEntryCommandHandler(IApplicationDbContext context)
    : IRequestHandler<AdjustPayrollEntryCommand, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(AdjustPayrollEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await context.PayrollEntries.FirstOrDefaultAsync(e => e.Id == request.PayrollEntryId, cancellationToken);
        if (entry is null)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_FOUND", "Payroll entry not found."));

        // §9.2's own wording: required specifically when the amount is
        // non-zero — a zero adjustment (clearing a previous one) needs no
        // justification.
        if (request.AdjustmentAmount != 0 && string.IsNullOrWhiteSpace(request.AdjustmentReason))
            return Result.Failure<PayrollEntryDto>(new Error(
                "PAYROLL_ADJUSTMENT_REASON_REQUIRED", "AdjustmentReason is required when AdjustmentAmount is non-zero."));

        var adjustResult = entry.Adjust(request.AdjustmentAmount, request.AdjustmentReason ?? string.Empty);
        if (adjustResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(adjustResult.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
