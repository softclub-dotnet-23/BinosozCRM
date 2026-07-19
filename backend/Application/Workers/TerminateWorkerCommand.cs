using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// MASTER §8.9's termination lifecycle has 5 points; this handler covers
// what's actually buildable today:
//   1. Open IndividualTask blocks termination — implemented below.
//   2. WorkOrderPayoutShare rows are left untouched — nothing to do, this
//      handler simply never touches that table.
//   3-4. Early PayrollEntry formation + outstanding PayrollAdvance rollup —
//      NOT implemented. PayrollEntry/PayrollAdvance have no Application
//      layer yet (Phase 5). Terminating a worker today does NOT produce a
//      final payroll draft — flagged for Phase 5's implementer, not
//      silently skipped.
//   5. IsActive=false, disappears from active lists — Worker.Terminate()
//      already sets IsActive; ListBrigadeWorkersQuery was retrofitted
//      alongside this command to filter it out (see that file).
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

        // §8.9 point 1: "блокируется, пока бригадир не закроет или не
        // переназначит" — note the "reassign" escape hatch doesn't actually
        // exist as a capability yet (no ReassignIndividualTaskCommand was
        // built in Phase 2 Step 2); only "closes" (Complete) currently works.
        var hasOpenTasks = await context.IndividualTasks.AnyAsync(
            t => t.AssignedToWorkerId == request.WorkerId && t.Status != IndividualTaskStatus.Done, cancellationToken);
        if (hasOpenTasks)
            return Result.Failure(new Error(
                "WORKER_HAS_OPEN_TASKS", "Worker has open individual tasks that must be closed or reassigned first."));

        worker.Terminate(request.TerminationDate);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
