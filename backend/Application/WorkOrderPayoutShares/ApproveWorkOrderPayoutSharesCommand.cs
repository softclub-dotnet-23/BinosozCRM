using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrderPayoutShares;

// MASTER §12 role matrix, taken literally per an explicit business decision
// (see PROGRESS.md Phase 5 Step 1): `WorkOrderPayoutShare | R | RA | ...` —
// Owner is R only, Prorab alone has A. Unlike the usual "Owner ⊇ Prorab"
// default elsewhere in this codebase, approval here is the on-site Prorab's
// job specifically, not Owner's — enforced at the controller
// ([Authorize(Roles = "Prorab")], no Owner). The identical gap in
// Timesheet.Approve (ApproveTimesheetCommand/TimesheetsController) was
// fixed the same way, same session.
// §9.4 names no explicit approve endpoint for this entity (only the PUT for
// setting shares) — built anyway, same "state machine needs it, table
// doesn't name it" gap as WorkOrder's Assign/Start/Close (Phase 2 Step 1)
// and MaterialRequest's /ordered (Phase 4 Step 2).
// §8.0's Piecework formula: OrderTotal = Σ(WorkOrderProgress.ReportedQty) ×
// WorkOrder.UnitPrice, WorkerAmount = OrderTotal × SharePercent / 100 — this
// is the same formula Phase 5 Step 3 will later aggregate across a whole
// payroll period; here it's snapshotted once, per §5.13's "Amount (снимок
// на момент подтверждения)".
public sealed record ApproveWorkOrderPayoutSharesCommand(Guid WorkOrderId) : IRequest<Result<IReadOnlyList<WorkOrderPayoutShareDto>>>;

public sealed class ApproveWorkOrderPayoutSharesCommandValidator : AbstractValidator<ApproveWorkOrderPayoutSharesCommand>
{
    public ApproveWorkOrderPayoutSharesCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class ApproveWorkOrderPayoutSharesCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveWorkOrderPayoutSharesCommand, Result<IReadOnlyList<WorkOrderPayoutShareDto>>>
{
    public async Task<Result<IReadOnlyList<WorkOrderPayoutShareDto>>> Handle(
        ApproveWorkOrderPayoutSharesCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(workOrder.ObjectId))
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var shares = await context.WorkOrderPayoutShares
            .Where(s => s.WorkOrderId == workOrder.Id)
            .ToListAsync(cancellationToken);
        if (shares.Count == 0)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error(
                "WORK_ORDER_SHARES_INVALID", "No payout shares have been set for this work order yet."));

        var reportedQty = await context.WorkOrderProgresses
            .Where(p => p.WorkOrderId == workOrder.Id)
            .SumAsync(p => (decimal?)p.ReportedQty, cancellationToken) ?? 0m;
        var orderTotal = reportedQty * workOrder.UnitPrice;

        foreach (var share in shares)
        {
            var amount = Math.Round(orderTotal * share.SharePercent / 100m, 2, MidpointRounding.AwayFromZero);
            share.Approve(currentUser.UserId!.Value, amount);
        }

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success<IReadOnlyList<WorkOrderPayoutShareDto>>(shares.Select(WorkOrderPayoutShareDto.FromEntity).ToList());
    }
}
