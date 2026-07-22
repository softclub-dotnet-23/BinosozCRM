using Application.Common.Interfaces;
using Application.IndividualTasks;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrderPayoutShares;

public sealed record WorkOrderPayoutShareInput(Guid WorkerId, decimal SharePercent);

// MASTER §5.13/§1.1: "PUT /work-orders/{id}/payout-shares Brigadir" — full
// replace of the whole set in one call, not per-row create, so the
// Σ SharePercent = 100.00 invariant can be checked atomically (§5.13's own
// note: checking row-by-row would reject every intermediate state).
// §7.3 boundary case: shares stay editable — and any prior Prorab approval
// is invalidated by the replace below — as long as the WorkOrder isn't yet
// Accepted ("при повторной сдаче доли можно переписать, пока не Accepted").
public sealed record SetWorkOrderPayoutSharesCommand(
    Guid WorkOrderId, IReadOnlyList<WorkOrderPayoutShareInput> Shares) : IRequest<Result<IReadOnlyList<WorkOrderPayoutShareDto>>>;

public sealed class SetWorkOrderPayoutSharesCommandValidator : AbstractValidator<SetWorkOrderPayoutSharesCommand>
{
    public SetWorkOrderPayoutSharesCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
        RuleFor(x => x.Shares).NotEmpty();
        RuleFor(x => x.Shares)
            .Must(shares => shares.Select(s => s.WorkerId).Distinct().Count() == shares.Count)
            .WithMessage("Each worker can only appear once in the share set.")
            .When(x => x.Shares.Count > 0);
        RuleForEach(x => x.Shares).ChildRules(share =>
        {
            share.RuleFor(s => s.WorkerId).NotEmpty();
            share.RuleFor(s => s.SharePercent).GreaterThan(0);
        });
    }
}

public sealed class SetWorkOrderPayoutSharesCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<SetWorkOrderPayoutSharesCommand, Result<IReadOnlyList<WorkOrderPayoutShareDto>>>
{
    public async Task<Result<IReadOnlyList<WorkOrderPayoutShareDto>>> Handle(
        SetWorkOrderPayoutSharesCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var ownBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != workOrder.BrigadeId)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        if (workOrder.Status is WorkOrderStatus.Accepted or WorkOrderStatus.Closed)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error(
                "WORK_ORDER_PAYOUT_SHARES_LOCKED", "Payout shares can no longer be edited once the work order is accepted."));

        var totalSharePercent = request.Shares.Sum(s => s.SharePercent);
        if (totalSharePercent != 100.00m)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error(
                "WORK_ORDER_SHARES_INVALID", "Payout shares must sum to exactly 100%."));

        var workerIds = request.Shares.Select(s => s.WorkerId).ToList();
        var brigadeWorkerCount = await context.Workers
            .CountAsync(w => workerIds.Contains(w.Id) && w.BrigadeId == workOrder.BrigadeId, cancellationToken);
        if (brigadeWorkerCount != workerIds.Count)
            return Result.Failure<IReadOnlyList<WorkOrderPayoutShareDto>>(new Error(
                "WORK_ORDER_PAYOUT_SHARE_WRONG_BRIGADE", "All workers must belong to the work order's own brigade."));

        var existingShares = await context.WorkOrderPayoutShares
            .Where(s => s.WorkOrderId == workOrder.Id)
            .ToListAsync(cancellationToken);
        context.WorkOrderPayoutShares.RemoveRange(existingShares);

        var newShares = request.Shares
            .Select(s => WorkOrderPayoutShare.Create(workOrder.CompanyId, workOrder.Id, s.WorkerId, s.SharePercent, currentUser.UserId!.Value))
            .ToList();
        context.WorkOrderPayoutShares.AddRange(newShares);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success<IReadOnlyList<WorkOrderPayoutShareDto>>(newShares.Select(WorkOrderPayoutShareDto.FromEntity).ToList());
    }
}
