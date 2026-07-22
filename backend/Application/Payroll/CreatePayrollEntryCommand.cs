using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §8.0/§8.1/§8.7/§8.8 — every UpdateDraft() component except
// AdjustmentAmount (Step 7's job, manual/Accountant-only, not computed).
// §9.4 names only `POST /payroll` (no separate recalculate endpoint), and
// PayrollEntry(WorkerId, PeriodStart, PeriodEnd) is UNIQUE (§6) — so this is
// an upsert: first call for a (Worker, Period) creates the Draft, a later
// call recomputes every amount in place (e.g. a Timesheet gets approved
// late, after the first draft). Rejected once the entry has moved past
// Draft — PayrollEntry.UpdateDraft() already enforces that.
public sealed record CreatePayrollEntryCommand(Guid WorkerId, DateOnly PeriodStart, DateOnly PeriodEnd)
    : IRequest<Result<PayrollEntryDto>>;

public sealed class CreatePayrollEntryCommandValidator : AbstractValidator<CreatePayrollEntryCommand>
{
    public CreatePayrollEntryCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.PeriodEnd).GreaterThanOrEqualTo(x => x.PeriodStart);
    }
}

public sealed class CreatePayrollEntryCommandHandler(IApplicationDbContext context)
    : IRequestHandler<CreatePayrollEntryCommand, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(CreatePayrollEntryCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure<PayrollEntryDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        var existingEntry = await context.PayrollEntries.FirstOrDefaultAsync(
            e => e.WorkerId == request.WorkerId && e.PeriodStart == request.PeriodStart && e.PeriodEnd == request.PeriodEnd,
            cancellationToken);

        var calculatedAmount = await CalculatedAmountCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var latenessDeductionAmount = await LatenessDeductionCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var bonusAmount = await BonusAmountCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var advanceDeductedAmount = await AdvanceDeductedAmountCalculator.ComputeAsync(context, worker, request.PeriodEnd, cancellationToken);

        PayrollEntry entry;
        if (existingEntry is null)
        {
            entry = PayrollEntry.Create(worker.CompanyId, worker.Id, request.PeriodStart, request.PeriodEnd);
            context.PayrollEntries.Add(entry);
        }
        else
        {
            entry = existingEntry;
        }

        var updateResult = entry.UpdateDraft(calculatedAmount, latenessDeductionAmount, bonusAmount, advanceDeductedAmount);
        if (updateResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(updateResult.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
