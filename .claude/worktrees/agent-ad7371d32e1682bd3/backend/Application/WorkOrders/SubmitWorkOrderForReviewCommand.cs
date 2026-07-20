using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §9.4/§7.1: POST /work-orders/{id}/submit — Brigadir, own brigade.
// WorkOrder.SubmitForReview requires (a) >=1 WorkOrderProgress report and
// (b) payout shares summing to 100% "if the brigade's PayRateType is
// Piecework". Both WorkOrderProgress (Phase 2 Step 4) and
// WorkOrderPayoutShare (Phase 5 Step 1) are queried for real here even
// though no handler can create either yet — they'll start returning true
// once those later steps land, with no change needed here.
//
// Found: §7.1 says PayRateType lives "у бригады" (on the brigade), but
// Domain only has it per-Worker (§5.7) — there's no Brigade-level field.
// Judgment call, not invented business math: a brigade "is Piecework" for
// this gate if it has at least one Piecework-rate worker; if none, the
// payout-share gate doesn't apply at all (trivially satisfied). Worth
// reconciling in MASTER.md — same class of Worker-vs-Brigade field mismatch
// as the Document-number gap from Phase 1 Step 6.
public sealed record SubmitWorkOrderForReviewCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class SubmitWorkOrderForReviewCommandValidator : AbstractValidator<SubmitWorkOrderForReviewCommand>
{
    public SubmitWorkOrderForReviewCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class SubmitWorkOrderForReviewCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IWorkOrderRealtimeNotifier notifier)
    : IRequestHandler<SubmitWorkOrderForReviewCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(SubmitWorkOrderForReviewCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForBrigadirAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderDto>(accessResult.Error);

        var order = accessResult.Value;
        var fromStatus = order.Status;

        var hasProgress = await context.WorkOrderProgresses.AnyAsync(p => p.WorkOrderId == order.Id, cancellationToken);

        var brigadeHasPieceworkWorkers = await context.Workers
            .AnyAsync(w => w.BrigadeId == order.BrigadeId && w.PayRateType == PayRateType.Piecework, cancellationToken);

        bool payoutShareComplete;
        if (!brigadeHasPieceworkWorkers)
        {
            payoutShareComplete = true;
        }
        else
        {
            var totalShare = await context.WorkOrderPayoutShares
                .Where(s => s.WorkOrderId == order.Id)
                .SumAsync(s => (decimal?)s.SharePercent, cancellationToken) ?? 0m;
            payoutShareComplete = totalShare == 100m;
        }

        var result = order.SubmitForReview(hasProgress, payoutShareComplete);
        if (result.IsFailure)
            return Result.Failure<WorkOrderDto>(result.Error);

        TaskLogWriter.Append(
            context,
            order.CompanyId,
            TaskLogEntityType.WorkOrder,
            order.Id,
            fromStatus.ToString(),
            order.Status.ToString(),
            currentUser.UserId!.Value);

        await context.SaveChangesAsync(cancellationToken);

        await notifier.NotifyStatusChangedAsync(order.CompanyId, order.Id, fromStatus.ToString(), order.Status.ToString(), cancellationToken);

        return Result.Success(WorkOrderDto.FromEntity(order));
    }
}
