using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §1.1/§5.13/§9.4: PUT /work-orders/{id}/payout-shares — Brigadir,
// own brigade, "распределяет вручную при закрытии наряда." §5.13's
// invariant — "Σ SharePercent = 100.00 ровно... проверяется в handler'е
// при сохранении всего набора разом — не построчно, иначе промежуточное
// состояние невалидно" — this handler replaces the entire share set in
// one SaveChanges, never row-by-row, so there's no window where a partial
// write leaves an invalid intermediate sum on disk.
//
// Gated on WorkOrder.Status == InProgress, same reasoning as
// AddWorkOrderProgressCommand's gate: shares are part of closing out the
// naряд, before /submit, not something that makes sense once it's already
// under review or accepted.
//
// ApprovedByUserId/Amount are deliberately left untouched here — §5.13
// says Amount is "снимок на момент подтверждения" and ApprovedByUserId is
// the Prorab's confirmation, neither of which has its own endpoint in
// §9.4 (no separate "approve shares" route exists). Read that as: the
// Prorab's Accept() on the WorkOrder itself is the confirmation, and
// Amount gets snapshotted once §8.0's CalculatedAmount exists (Phase 5
// Step 3) — not invented here.
public sealed record WorkOrderPayoutShareInput(Guid WorkerId, decimal SharePercent);

public sealed record SetWorkOrderPayoutSharesCommand(
    Guid WorkOrderId,
    IReadOnlyList<WorkOrderPayoutShareInput> Shares) : IRequest<Result<List<WorkOrderPayoutShareDto>>>;

public sealed class SetWorkOrderPayoutSharesCommandValidator : AbstractValidator<SetWorkOrderPayoutSharesCommand>
{
    public SetWorkOrderPayoutSharesCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
        RuleFor(x => x.Shares).NotEmpty();

        RuleForEach(x => x.Shares).ChildRules(share =>
        {
            share.RuleFor(s => s.WorkerId).NotEmpty();
            share.RuleFor(s => s.SharePercent).GreaterThan(0);
        });

        // The Σ=100 invariant and the no-duplicate-worker check are NOT
        // FluentValidation rules — ValidationBehavior hardcodes every
        // FluentValidation failure to the generic VALIDATION_FAILED code
        // regardless of WithErrorCode(), but §9.2's catalog specifically
        // calls for WORK_ORDER_SHARES_INVALID here. Checked explicitly in
        // the handler instead, same as every other domain-specific error
        // code in this codebase.
    }
}

public sealed class SetWorkOrderPayoutSharesCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<SetWorkOrderPayoutSharesCommand, Result<List<WorkOrderPayoutShareDto>>>
{
    public async Task<Result<List<WorkOrderPayoutShareDto>>> Handle(SetWorkOrderPayoutSharesCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForBrigadirAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<List<WorkOrderPayoutShareDto>>(accessResult.Error);

        var order = accessResult.Value;
        if (order.Status != WorkOrderStatus.InProgress)
            return Result.Failure<List<WorkOrderPayoutShareDto>>(
                new Error("WORK_ORDER_INVALID_TRANSITION", "Payout shares can only be set while the work order is in progress."));

        // §5.13: "Σ SharePercent = 100.00 ровно... проверяется... при
        // сохранении всего набора разом" — checked once against the sum
        // of the whole incoming set, before anything is written.
        if (request.Shares.Sum(s => s.SharePercent) != 100m)
            return Result.Failure<List<WorkOrderPayoutShareDto>>(new Error("WORK_ORDER_SHARES_INVALID", "Payout shares must sum to exactly 100%."));

        var workerIds = request.Shares.Select(s => s.WorkerId).ToList();
        if (workerIds.Distinct().Count() != workerIds.Count)
            return Result.Failure<List<WorkOrderPayoutShareDto>>(new Error("WORK_ORDER_SHARES_INVALID", "Each worker can only appear once in the payout share set."));
        var brigadeWorkerCount = await context.Workers
            .CountAsync(w => workerIds.Contains(w.Id) && w.BrigadeId == order.BrigadeId, cancellationToken);
        if (brigadeWorkerCount != workerIds.Distinct().Count())
            return Result.Failure<List<WorkOrderPayoutShareDto>>(new Error("WORKER_NOT_FOUND", "One or more workers were not found in this work order's brigade."));

        var existingShares = await context.WorkOrderPayoutShares
            .Where(s => s.WorkOrderId == order.Id)
            .ToListAsync(cancellationToken);
        context.WorkOrderPayoutShares.RemoveRange(existingShares);

        var newShares = request.Shares
            .Select(s => WorkOrderPayoutShare.Create(order.CompanyId, order.Id, s.WorkerId, s.SharePercent, currentUser.UserId!.Value))
            .ToList();
        context.WorkOrderPayoutShares.AddRange(newShares);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(newShares.Select(WorkOrderPayoutShareDto.FromEntity).ToList());
    }
}
