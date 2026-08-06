using Application.Common.Interfaces;
using Application.Payroll;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// MASTER §8.9 "Увольнение": on Worker.TerminationDate, five things happen.
//  1. Open IndividualTask (Status != Done) blocks termination outright —
//     "не удалять молча, там может быть незакрытая работа" — until the
//     Brigadir closes or reassigns it.
//  2. WorkOrderPayoutShare rows "остаются" — no code needed, just don't
//     touch them.
//  3. "Текущий PayrollEntry формируется... досрочно, не дожидаясь конца
//     месяца" — the Draft for the period containing TerminationDate is
//     created (or, if the background job already created one for the full
//     natural period, shortened) to end exactly at TerminationDate, then
//     recomputed over that shortened range using the same calculators
//     GeneratePayrollDraftCommand uses (Phase 5 Steps 3-6, now available).
//  4. "Непогашенные авансы попадают в этот финальный расчёт" —
//     AdvanceDeductedAmountCalculator's own `IssuedAt <= PeriodEnd` bound
//     does this automatically once PeriodEnd is TerminationDate.
//  5. IsActive = false (Worker.Terminate() already does this) — "исчезает
//     из активных списков" is ListBrigadeWorkersQuery's job.
//
// An existing entry that's already Approved/Paid for this period is left
// untouched — termination can't rewrite a payroll figure that's already
// been signed off; that's an edge case for a human to reconcile manually,
// not something to silently override.
public sealed record TerminateWorkerCommand(Guid WorkerId, DateOnly TerminationDate) : IRequest<Result>;

public sealed class TerminateWorkerCommandValidator : AbstractValidator<TerminateWorkerCommand>
{
    public TerminateWorkerCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.TerminationDate).NotEmpty();
    }
}

public sealed class TerminateWorkerCommandHandler(IApplicationDbContext context)
    : IRequestHandler<TerminateWorkerCommand, Result>
{
    public async Task<Result> Handle(TerminateWorkerCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure(new Error("WORKER_NOT_FOUND", "Worker not found."));

        var hasOpenTasks = await context.IndividualTasks
            .AnyAsync(t => t.AssignedToWorkerId == request.WorkerId && t.Status != IndividualTaskStatus.Done, cancellationToken);
        if (hasOpenTasks)
            return Result.Failure(new Error("WORKER_HAS_OPEN_TASKS", "Worker has open individual tasks — close or reassign them before terminating."));

        var company = await context.Companies.FirstAsync(c => c.Id == worker.CompanyId, cancellationToken);
        var (periodStart, _) = PayrollPeriodCalculator.GetPeriodContaining(request.TerminationDate, company.PayrollPeriodType);

        var entry = await context.PayrollEntries
            .FirstOrDefaultAsync(p => p.WorkerId == worker.Id && p.PeriodStart == periodStart, cancellationToken);

        if (entry is null)
        {
            entry = PayrollEntry.Create(worker.CompanyId, worker.Id, periodStart, request.TerminationDate);
            context.PayrollEntries.Add(entry);
        }
        else if (entry.Status == PayrollEntryStatus.Draft)
        {
            entry.ShortenPeriodEnd(request.TerminationDate);
        }
        else
        {
            entry = null;
        }

        if (entry is not null)
        {
            var calculatedAmount = await CalculatedAmountCalculator.ComputeAsync(context, worker, periodStart, request.TerminationDate, cancellationToken);
            var latenessDeductionAmount = await LatenessDeductionCalculator.ComputeAsync(context, worker, periodStart, request.TerminationDate, cancellationToken);
            var bonusAmount = await BonusAmountCalculator.ComputeAsync(context, worker, periodStart, request.TerminationDate, cancellationToken);
            var advanceDeductedAmount = await AdvanceDeductedAmountCalculator.ComputeAsync(context, worker, request.TerminationDate, cancellationToken);

            entry.UpdateDraft(calculatedAmount, latenessDeductionAmount, bonusAmount, advanceDeductedAmount);
        }

        worker.Terminate(request.TerminationDate);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
