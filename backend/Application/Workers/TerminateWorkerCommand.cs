using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// MASTER §8.9 "Увольнение": on Worker.TerminationDate, five things happen.
// This handler covers what's actually buildable right now:
//  1. Open IndividualTask (Status != Done) blocks termination outright —
//     "не удалять молча, там может быть незакрытая работа" — until the
//     Brigadir closes or reassigns it (Create/Start/Complete already exist,
//     nothing new needed there).
//  2. WorkOrderPayoutShare rows "остаются" — no code needed, just don't
//     touch them (the entity doesn't even have an Application layer yet —
//     Phase 5 Step 1).
//  5. IsActive = false (Worker.Terminate() already does this) — "исчезает
//     из активных списков" is ListBrigadeWorkersQuery's job, done alongside
//     this handler in the same step.
//
// NOT built here — genuinely can't be yet, not a scope shortcut:
//  3. "Текущий PayrollEntry формируется... досрочно" and
//  4. "непогашенные авансы попадают в этот финальный расчёт"
// both require §8.0's CalculatedAmount formula and PayrollAdvance
// settlement, neither of which exist anywhere in Application yet — they're
// Phase 5 Steps 3/6/7, not built until then. Forcing them in now would mean
// building payroll calculation as a side effect of a Phase 3 step, exactly
// the "batch multiple steps into one pass" AGENTS.md rules out. Flagged
// here so Phase 5's TerminationDate handling isn't forgotten once
// CalculatedAmount lands.
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

        worker.Terminate(request.TerminationDate);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
