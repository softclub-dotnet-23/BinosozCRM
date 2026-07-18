using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §7.1: "InProgress -> OnReview — только Brigadir своей бригады.
// Требует: >=1 WorkOrderProgress и заполненный WorkOrderPayoutShare с
// суммой 100% (если PayRateType=Piecework у бригады)."
public sealed record SubmitWorkOrderForReviewCommand(Guid WorkOrderId) : IRequest<Result<WorkOrderDto>>;

public sealed class SubmitWorkOrderForReviewCommandValidator : AbstractValidator<SubmitWorkOrderForReviewCommand>
{
    public SubmitWorkOrderForReviewCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
    }
}

public sealed class SubmitWorkOrderForReviewCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<SubmitWorkOrderForReviewCommand, Result<WorkOrderDto>>
{
    public async Task<Result<WorkOrderDto>> Handle(SubmitWorkOrderForReviewCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var ownBrigadeId = await WorkOrderAccess.GetBrigadirOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != workOrder.BrigadeId)
            return Result.Failure<WorkOrderDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var hasProgress = await context.WorkOrderProgresses.AnyAsync(p => p.WorkOrderId == workOrder.Id, cancellationToken);

        // §7.1's "если PayRateType=Piecework у бригады" names a field that
        // lives on Worker (§5.7), not Brigade — Brigade has no PayRateType
        // of its own. Interpreted as: the 100%-share requirement only bites
        // when the brigade has at least one Piecework worker; a purely
        // Hourly brigade skips it. Flagged as an interpretation, not a
        // literal field match — worth confirming once WorkOrderPayoutShare
        // gets real write paths in Phase 5.
        var brigadeHasPieceworkWorker = await context.Workers
            .AnyAsync(w => w.BrigadeId == workOrder.BrigadeId && w.PayRateType == PayRateType.Piecework, cancellationToken);

        var payoutShareComplete = true;
        if (brigadeHasPieceworkWorker)
        {
            var totalSharePercent = await context.WorkOrderPayoutShares
                .Where(s => s.WorkOrderId == workOrder.Id)
                .SumAsync(s => (decimal?)s.SharePercent, cancellationToken) ?? 0m;
            payoutShareComplete = totalSharePercent == 100m;
        }

        return await WorkOrderTransitionHelper.ApplyAsync(
            context, workOrder, () => workOrder.SubmitForReview(hasProgress, payoutShareComplete),
            currentUser.UserId!.Value, comment: null, cancellationToken);
    }
}
