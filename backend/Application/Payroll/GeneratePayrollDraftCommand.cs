using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §9.4/§8.0: POST /payroll — Accountant, Owner. Generates or
// recomputes a Draft PayrollEntry per active Worker for the given period.
// §8.0's own closing rule: "Нет ни одного принятого табеля / ни одного
// наряда -> CalculatedAmount = 0, PayrollEntry всё равно создаётся" — a
// zero-amount entry is still created for every worker, not skipped, so
// the Accountant sees a zero row to investigate rather than a worker
// silently missing from the sheet.
//
// Idempotent per (WorkerId, PeriodStart, PeriodEnd): re-running this for
// the same period recomputes CalculatedAmount, LatenessDeductionAmount
// (Step 4), BonusAmount (Step 5), and AdvanceDeductedAmount (Step 6) on
// any entry still in Draft. An entry that's already Approved or Paid is
// left untouched entirely — PayrollEntry.UpdateDraft's own guard would
// reject the write anyway, but skipping it here avoids wasting a query
// result on a status that will simply fail.
public sealed record GeneratePayrollDraftCommand(DateOnly PeriodStart, DateOnly PeriodEnd) : IRequest<Result<List<PayrollEntryDto>>>;

public sealed class GeneratePayrollDraftCommandValidator : AbstractValidator<GeneratePayrollDraftCommand>
{
    public GeneratePayrollDraftCommandValidator()
    {
        RuleFor(x => x.PeriodEnd).GreaterThanOrEqualTo(x => x.PeriodStart);
    }
}

// No ICurrentUserService needed — Workers already comes back
// company-scoped via ApplicationDbContext's automatic CompanyId global
// query filter (Rule 2), nothing here re-derives the caller's identity.
public sealed class GeneratePayrollDraftCommandHandler(IApplicationDbContext context)
    : IRequestHandler<GeneratePayrollDraftCommand, Result<List<PayrollEntryDto>>>
{
    public async Task<Result<List<PayrollEntryDto>>> Handle(GeneratePayrollDraftCommand request, CancellationToken cancellationToken)
    {
        var workers = await context.Workers.Where(w => w.IsActive).ToListAsync(cancellationToken);
        var results = new List<PayrollEntryDto>();

        foreach (var worker in workers)
        {
            var existing = await context.PayrollEntries.FirstOrDefaultAsync(
                p => p.WorkerId == worker.Id && p.PeriodStart == request.PeriodStart && p.PeriodEnd == request.PeriodEnd,
                cancellationToken);

            if (existing is not null && existing.Status != PayrollEntryStatus.Draft)
            {
                results.Add(PayrollEntryDto.FromEntity(existing));
                continue;
            }

            var calculatedAmount = await CalculatedAmountCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
            var latenessDeductionAmount = await LatenessDeductionCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
            var bonusAmount = await BonusAmountCalculator.ComputeAsync(context, worker, request.PeriodStart, request.PeriodEnd, cancellationToken);
            var advanceDeductedAmount = await AdvanceDeductedAmountCalculator.ComputeAsync(context, worker, request.PeriodEnd, cancellationToken);

            if (existing is null)
            {
                existing = PayrollEntry.Create(worker.CompanyId, worker.Id, request.PeriodStart, request.PeriodEnd);
                context.PayrollEntries.Add(existing);
            }

            existing.UpdateDraft(calculatedAmount, latenessDeductionAmount, bonusAmount, advanceDeductedAmount);

            results.Add(PayrollEntryDto.FromEntity(existing));
        }

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(results);
    }
}
