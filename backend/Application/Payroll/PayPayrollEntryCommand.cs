using Application.Common.Interfaces;
using Application.WorkOrders;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §9.4 groups this with Approve ("POST /payroll/{id}/approve |
// /pay") — same entity, same Owner/Accountant caller, so built alongside
// it rather than left as a dangling Approved status nothing ever reaches
// Paid from. Writes AdminAuditAction.PayrollPaid explicitly, same reason
// as Step 6's AdvanceIssued: AdminAuditSaveChangesInterceptor only watches
// Modified state on User/Worker/Brigade, not PayrollEntry.
public sealed record PayPayrollEntryCommand(Guid PayrollEntryId) : IRequest<Result<PayrollEntryDto>>;

public sealed class PayPayrollEntryCommandValidator : AbstractValidator<PayPayrollEntryCommand>
{
    public PayPayrollEntryCommandValidator()
    {
        RuleFor(x => x.PayrollEntryId).NotEmpty();
    }
}

public sealed class PayPayrollEntryCommandHandler(
    IApplicationDbContext context, ICurrentUserService currentUser, IWorkOrderRealtimeNotifier notifier)
    : IRequestHandler<PayPayrollEntryCommand, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(PayPayrollEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await context.PayrollEntries.FirstOrDefaultAsync(e => e.Id == request.PayrollEntryId, cancellationToken);
        if (entry is null)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_FOUND", "Payroll entry not found."));

        // §9.2's dedicated code for "правка после Paid" — same reasoning
        // as ApprovePayrollEntryCommand's identical check.
        if (entry.Status == PayrollEntryStatus.Paid)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ALREADY_PAID", "This payroll entry has already been paid."));

        var paidAt = DateTimeOffset.UtcNow;
        var payResult = entry.Pay(paidAt);
        if (payResult.IsFailure)
            return Result.Failure<PayrollEntryDto>(payResult.Error);

        context.AdminAuditLogs.Add(AdminAuditLog.Create(
            entry.CompanyId, currentUser.UserId!.Value, AdminAuditAction.PayrollPaid, nameof(PayrollEntry), entry.Id, paidAt,
            newValueJson: $"{{\"value\":\"{entry.FinalAmount}\"}}"));

        await context.SaveChangesAsync(cancellationToken);

        // MASTER §7.1: "Accepted -> Closed - авто после PayrollEntry.Paid за
        // период" — the automatic half of WorkOrder.Close(). A separate
        // SaveChangesAsync, deliberately after the one above: the auto-closer
        // checks every contributing worker's PayrollEntry.Status via a fresh
        // query, which only sees this worker's own Paid status once it's
        // actually committed, not just tracked in memory.
        var closedOrders = await WorkOrderAutoCloser.CloseEligibleOrdersAsync(
            context, entry.CompanyId, entry.WorkerId, entry.PeriodStart, entry.PeriodEnd, currentUser.UserId!.Value, cancellationToken);

        if (closedOrders.Count > 0)
            await context.SaveChangesAsync(cancellationToken);

        foreach (var closedOrder in closedOrders)
            await notifier.NotifyStatusChangedAsync(entry.CompanyId, closedOrder.WorkOrderId, closedOrder.FromStatus, closedOrder.ToStatus, cancellationToken);

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
