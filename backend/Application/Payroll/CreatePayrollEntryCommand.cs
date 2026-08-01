using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
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

public sealed class CreatePayrollEntryCommandHandler(
    IApplicationDbContext context,
    IBusinessTimeProvider businessTime)
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

        // An exact period is an upsert target, not an overlap. Look it up
        // before the inclusive overlap check so a later draft generation can
        // refresh its amounts in place.
        var existingEntry = await context.PayrollEntries.FirstOrDefaultAsync(
            e => e.WorkerId == request.WorkerId
                 && e.PeriodStart == request.PeriodStart
                 && e.PeriodEnd == request.PeriodEnd,
            cancellationToken);

        if (existingEntry is not null && existingEntry.Status != PayrollEntryStatus.Draft)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_DRAFT", "Only a Draft payroll entry can be recalculated."));

        if (existingEntry is null)
        {
            var overlapsExistingPeriod = await context.PayrollEntries.AnyAsync(
                e => e.WorkerId == request.WorkerId
                     && e.PeriodStart <= request.PeriodEnd
                     && e.PeriodEnd >= request.PeriodStart,
                cancellationToken);
            if (overlapsExistingPeriod)
                return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_PERIOD_OVERLAP", "Payroll period overlaps an existing entry for this worker."));
        }

        var calculatedAmount = await CalculatedAmountCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var latenessDeductionAmount = await LatenessDeductionCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
        var bonusAmount = await BonusAmountCalculator.ComputeAsync(
            context, worker, request.PeriodStart, request.PeriodEnd, businessTime, cancellationToken);
        var advanceDeductedAmount = await AdvanceDeductedAmountCalculator.ComputeAsync(context, worker, request.PeriodEnd, cancellationToken);

        var isNewEntry = existingEntry is null;
        var entry = existingEntry ?? PayrollEntry.Create(worker.CompanyId, worker.Id, request.PeriodStart, request.PeriodEnd);
        if (isNewEntry)
            context.PayrollEntries.Add(entry);

        var updateResult = entry.UpdateDraft(calculatedAmount, latenessDeductionAmount, bonusAmount, advanceDeductedAmount);
        if (updateResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(updateResult.Error);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (isNewEntry)
        {
            // The unique index and PostgreSQL exclusion constraint are the
            // final guard against concurrent inserts. A concurrent exact
            // insert is still an upsert; only a different persisted period
            // is reported as an overlap. Other database failures propagate.
            context.PayrollEntries.Remove(entry);

            var concurrentEntry = await context.PayrollEntries.FirstOrDefaultAsync(
                e => e.WorkerId == request.WorkerId
                     && e.PeriodStart == request.PeriodStart
                     && e.PeriodEnd == request.PeriodEnd,
                cancellationToken);

            if (concurrentEntry is not null)
            {
                if (concurrentEntry.Status != PayrollEntryStatus.Draft)
                    return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_DRAFT", "Only a Draft payroll entry can be recalculated."));

                var concurrentUpdateResult = concurrentEntry.UpdateDraft(
                    calculatedAmount, latenessDeductionAmount, bonusAmount, advanceDeductedAmount);
                if (concurrentUpdateResult.IsFailure)
                    return Result.Failure<PayrollEntryDto>(concurrentUpdateResult.Error);

                await context.SaveChangesAsync(cancellationToken);
                return Result.Success(PayrollEntryDto.FromEntity(concurrentEntry));
            }

            var overlapsExistingPeriod = await context.PayrollEntries.AnyAsync(
                e => e.WorkerId == request.WorkerId
                     && e.PeriodStart <= request.PeriodEnd
                     && e.PeriodEnd >= request.PeriodStart,
                cancellationToken);
            if (overlapsExistingPeriod)
                return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_PERIOD_OVERLAP", "Payroll period overlaps an existing entry for this worker."));

            throw;
        }

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
