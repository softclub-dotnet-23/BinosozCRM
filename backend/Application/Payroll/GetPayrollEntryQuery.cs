using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

public sealed record GetPayrollEntryQuery(Guid Id) : IRequest<Result<PayrollEntryDto>>;

public sealed class GetPayrollEntryQueryValidator : AbstractValidator<GetPayrollEntryQuery>
{
    public GetPayrollEntryQueryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
    }
}

public sealed class GetPayrollEntryQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetPayrollEntryQuery, Result<PayrollEntryDto>>
{
    public async Task<Result<PayrollEntryDto>> Handle(GetPayrollEntryQuery request, CancellationToken cancellationToken)
    {
        var entry = await context.PayrollEntries.FirstOrDefaultAsync(e => e.Id == request.Id, cancellationToken);
        if (entry is null)
            return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_FOUND", "Payroll entry not found."));

        if (currentUser.Role == Role.Brigadir)
        {
            var ownWorkerId = await context.Workers
                .Where(w => w.UserId == currentUser.UserId)
                .Select(w => (Guid?)w.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (entry.WorkerId != ownWorkerId)
                return Result.Failure<PayrollEntryDto>(new Error("PAYROLL_ENTRY_NOT_FOUND", "Payroll entry not found."));
        }

        return Result.Success(PayrollEntryDto.FromEntity(entry));
    }
}
