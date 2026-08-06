using Application.Common;
using Application.Common.Interfaces;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §7.1: "Accepted -> Closed - авто после PayrollEntry.Paid за
// период." A WorkOrder's Piecework earnings are split across several
// workers via WorkOrderPayoutShare (§1.1) — closing after just ONE
// contributor's PayrollEntry reaches Paid would be wrong if the others
// haven't been paid yet, so this only closes an order once EVERY worker
// who has a share in it has a Paid PayrollEntry covering the order's
// CompletedDate. Called from PayPayrollEntryCommand after a Pay()
// succeeds, once per newly-paid worker.
//
// Only ever finds candidates for orders that HAVE WorkOrderPayoutShare
// rows — i.e. Piecework brigades. An Hourly brigade's hours aren't
// attributed to a specific WorkOrder in PayrollEntry at all (§8.0), so
// there's nothing here to key an automatic close off; those orders close
// only via CloseWorkOrderCommand (Prorab, manual) — same conclusion
// CloseWorkOrderCommand's own comment reaches from the other side.
//
// Mutates the tracked context (closes eligible orders, queues their
// TaskLog rows) but never calls SaveChangesAsync or notifies — the caller
// runs this AFTER its own PayrollEntry.Pay() has already been saved (this
// method checks every contributing worker's PayrollEntry.Status via a
// fresh query, which must see the just-paid worker's own committed status,
// not just an in-memory tracked change) and then saves again to commit
// whichever orders this call closed, still "TaskLog in the same
// transaction as the [WorkOrder] transition" — just not the same
// transaction as the payroll write that triggered it. Returns the
// transitions so the caller can notify after that second save succeeds.
internal static class WorkOrderAutoCloser
{
    public readonly record struct ClosedOrder(Guid WorkOrderId, string FromStatus, string ToStatus);

    public static async Task<List<ClosedOrder>> CloseEligibleOrdersAsync(
        IApplicationDbContext context,
        Guid companyId,
        Guid paidWorkerId,
        DateOnly periodStart,
        DateOnly periodEnd,
        Guid actorUserId,
        CancellationToken cancellationToken)
    {
        var candidateOrderIds = await context.WorkOrderPayoutShares
            .Where(s => s.WorkerId == paidWorkerId)
            .Select(s => s.WorkOrderId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (candidateOrderIds.Count == 0)
            return [];

        var candidates = await context.WorkOrders
            .Where(w => candidateOrderIds.Contains(w.Id)
                        && w.Status == WorkOrderStatus.Accepted
                        && w.CompletedDate != null
                        && w.CompletedDate >= periodStart && w.CompletedDate <= periodEnd)
            .ToListAsync(cancellationToken);

        var closed = new List<ClosedOrder>();

        foreach (var order in candidates)
        {
            var completedDate = order.CompletedDate!.Value;

            var contributingWorkerIds = await context.WorkOrderPayoutShares
                .Where(s => s.WorkOrderId == order.Id)
                .Select(s => s.WorkerId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var allContributorsPaid = true;
            foreach (var workerId in contributingWorkerIds)
            {
                var isPaid = await context.PayrollEntries.AnyAsync(
                    p => p.WorkerId == workerId
                         && p.Status == PayrollEntryStatus.Paid
                         && p.PeriodStart <= completedDate && p.PeriodEnd >= completedDate,
                    cancellationToken);

                if (!isPaid)
                {
                    allContributorsPaid = false;
                    break;
                }
            }

            if (!allContributorsPaid)
                continue;

            var fromStatus = order.Status;
            var closeResult = order.Close();
            if (closeResult.IsFailure)
                continue;

            TaskLogWriter.Append(
                context,
                companyId,
                TaskLogEntityType.WorkOrder,
                order.Id,
                fromStatus.ToString(),
                order.Status.ToString(),
                actorUserId,
                "Auto-closed: payroll paid for every contributing worker.");

            closed.Add(new ClosedOrder(order.Id, fromStatus.ToString(), order.Status.ToString()));
        }

        return closed;
    }
}
