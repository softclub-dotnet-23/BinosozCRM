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

        var company = await context.Companies.FirstOrDefaultAsync(c => c.Id == worker.CompanyId, cancellationToken);
        if (company is null)
            return Result.Failure<PayrollEntryDto>(new Error("COMPANY_NOT_FOUND", "Company not found."));

        if (!PayrollPeriodCalculator.IsStandardPeriod(request.PeriodStart, request.PeriodEnd, company.PayrollPeriodType))
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_PERIOD_NON_STANDARD", "Payroll entries must use a standard company payroll period."));

        var overlapsExistingPeriod = await context.PayrollEntries.AnyAsync(
            e => e.WorkerId == request.WorkerId
                 && e.PeriodStart <= request.PeriodEnd
                 && e.PeriodEnd >= request.PeriodStart,
            cancellationToken);
        if (overlapsExistingPeriod)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_PERIOD_OVERLAP", "Payroll period overlaps an existing entry for this worker."));

        var calculatedAmount = await CalculatedAmountCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var latenessDeductionAmount = await LatenessDeductionCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var bonusAmount = await BonusAmountCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var advanceDeductedAmount = await AdvanceDeductedAmountCalculator.ComputeAsync(context, worker, request.PeriodEnd, cancellationToken);

        var entry = PayrollEntry.Create(worker.CompanyId, worker.Id, request.PeriodStart, request.PeriodEnd);
        context.PayrollEntries.Add(entry);

        var updateResult = entry.UpdateDraft(calculatedAmount, latenessDeductionAmount, bonusAmount, advanceDeductedAmount);
        if (updateResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(updateResult.Error);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_PERIOD_OVERLAP", "Payroll period overlaps an existing entry for this worker."));
        }

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
