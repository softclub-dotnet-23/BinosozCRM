using System.Text.Json;
using Application.Common.Interfaces;
using Application.WorkOrders;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §9.4: POST /payroll/{id}/pay — Accountant, Owner.
// AdminAuditAction.PayrollPaid (§5.16) — written explicitly, same reason
// as AdvanceIssued (Phase 5 Step 6): the interceptor only watches
// modified rows on User/Worker/Brigade, not a PayrollEntry.Status change.
public sealed record PayPayrollEntryCommand(Guid PayrollEntryId) : IRequest<Result<PayrollEntryDto>>;

public sealed class PayPayrollEntryCommandValidator : AbstractValidator<PayPayrollEntryCommand>
{
    public PayPayrollEntryCommandValidator()
    {
        RuleFor(x => x.PayrollEntryId).NotEmpty();
    }
}

public sealed class PayPayrollEntryCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IWorkOrderRealtimeNotifier notifier)
    : IRequestHandler<PayPayrollEntryCommand, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(PayPayrollEntryCommand request, CancellationToken cancellationToken)
    {
        var entry = await context.PayrollEntries.FirstOrDefaultAsync(p => p.Id == request.PayrollEntryId, cancellationToken);
        if (entry is null)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_FOUND", "Payroll entry not found."));

        if (entry.Status == PayrollEntryStatus.Paid)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ALREADY_PAID", "This payroll entry has already been paid."));

        var paidAt = DateTimeOffset.UtcNow;
        var result = entry.Pay(paidAt);
        if (result.IsFailure)
            return Result.Failure<PayrollEntryDto>(result.Error);

        context.AdminAuditLogs.Add(AdminAuditLog.Create(
            entry.CompanyId,
            currentUser.UserId!.Value,
            AdminAuditAction.PayrollPaid,
            nameof(PayrollEntry),
            entry.Id,
            paidAt,
            oldValueJson: null,
            newValueJson: JsonSerializer.Serialize(new { finalAmount = entry.FinalAmount, workerId = entry.WorkerId })));

        await context.SaveChangesAsync(cancellationToken);

        // MASTER §7.1: "Accepted -> Closed - авто после PayrollEntry.Paid за
        // период" — the automatic half of WorkOrder.Close(). Runs AFTER the
        // payroll save above, deliberately a separate SaveChangesAsync: the
        // auto-closer checks every contributing worker's PayrollEntry.Status
        // via a fresh query, which only sees this worker's own Paid status
        // once it's actually committed, not just tracked in memory.
        var closedOrders = await WorkOrderAutoCloser.CloseEligibleOrdersAsync(
            context, entry.CompanyId, entry.WorkerId, entry.PeriodStart, entry.PeriodEnd, currentUser.UserId!.Value, cancellationToken);

        if (closedOrders.Count > 0)
            await context.SaveChangesAsync(cancellationToken);

        foreach (var closedOrder in closedOrders)
            await notifier.NotifyStatusChangedAsync(entry.CompanyId, closedOrder.WorkOrderId, closedOrder.FromStatus, closedOrder.ToStatus, cancellationToken);

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
