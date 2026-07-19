using System.Text.Json;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §9.4/§8.8: POST /payroll-advances — Accountant, Owner. A separate
// entity, not a PayrollEntry field — "авансов за период может быть
// несколько, у каждого своя дата и свой выдавший." §8.8: "Аванс выдаёт
// Accountant/Owner, пишется в AdminAuditLog" — written explicitly here
// (AdminAuditSaveChangesInterceptor only watches Modified rows on
// User/Worker/Brigade for its existing actions; issuing an advance is a
// new PayrollAdvance row, a different shape of event, so it's logged
// directly rather than teaching the interceptor about Added-state rows
// for one more entity).
public sealed record IssuePayrollAdvanceCommand(Guid WorkerId, decimal Amount, string? Note) : IRequest<Result<PayrollAdvanceDto>>;

public sealed class IssuePayrollAdvanceCommandValidator : AbstractValidator<IssuePayrollAdvanceCommand>
{
    public IssuePayrollAdvanceCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Note).MaximumLength(1000);
    }
}

public sealed class IssuePayrollAdvanceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<IssuePayrollAdvanceCommand, Result<PayrollAdvanceDto>>
{
    public async Task<Result<PayrollAdvanceDto>> Handle(IssuePayrollAdvanceCommand request, CancellationToken cancellationToken)
    {
        if (!await context.Workers.AnyAsync(w => w.Id == request.WorkerId, cancellationToken))
            return Result.Failure<PayrollAdvanceDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        var issuedAt = DateTimeOffset.UtcNow;

        var advance = PayrollAdvance.Create(
            currentUser.CompanyId!.Value,
            request.WorkerId,
            request.Amount,
            issuedAt,
            currentUser.UserId!.Value,
            request.Note);

        context.PayrollAdvances.Add(advance);

        context.AdminAuditLogs.Add(AdminAuditLog.Create(
            currentUser.CompanyId!.Value,
            currentUser.UserId!.Value,
            AdminAuditAction.AdvanceIssued,
            nameof(PayrollAdvance),
            advance.Id,
            issuedAt,
            oldValueJson: null,
            newValueJson: JsonSerializer.Serialize(new { amount = request.Amount, workerId = request.WorkerId })));

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(PayrollAdvanceDto.FromEntity(advance));
    }
}
