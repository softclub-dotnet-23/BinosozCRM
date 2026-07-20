using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.PayrollAdvances;

// MASTER §8.8: a separate entity, not a PayrollEntry field — a worker can
// have several advances in one period, each with its own date and issuer.
// §9.4/§12: "аванс выдаёт Accountant/Owner, пишется в AdminAuditLog" — the
// existing AdminAuditSaveChangesInterceptor (Phase 1 Step 5) only watches
// EntityState.Modified on User/Worker/Brigade, never Added, and it lives
// under Infrastructure/Persistence/ — Zone A's hard boundary, not touched
// here. AdvanceIssued is written explicitly in this handler instead, the
// same way every other Zone A table this phase reads/writes is used: as a
// consumer via IApplicationDbContext, not by editing Ahmad's files.
public sealed record CreatePayrollAdvanceCommand(Guid WorkerId, decimal Amount, string? Note) : IRequest<Result<PayrollAdvanceDto>>;

public sealed class CreatePayrollAdvanceCommandValidator : AbstractValidator<CreatePayrollAdvanceCommand>
{
    public CreatePayrollAdvanceCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public sealed class CreatePayrollAdvanceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreatePayrollAdvanceCommand, Result<PayrollAdvanceDto>>
{
    public async Task<Result<PayrollAdvanceDto>> Handle(CreatePayrollAdvanceCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure<PayrollAdvanceDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        var issuedAt = DateTimeOffset.UtcNow;
        var advance = PayrollAdvance.Create(worker.CompanyId, worker.Id, request.Amount, issuedAt, currentUser.UserId!.Value, request.Note);
        context.PayrollAdvances.Add(advance);

        var auditEntry = AdminAuditLog.Create(
            worker.CompanyId, currentUser.UserId.Value, AdminAuditAction.AdvanceIssued, nameof(PayrollAdvance), advance.Id, issuedAt,
            newValueJson: $"{{\"value\":\"{request.Amount}\"}}");
        context.AdminAuditLogs.Add(auditEntry);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(PayrollAdvanceDto.FromEntity(advance));
    }
}
