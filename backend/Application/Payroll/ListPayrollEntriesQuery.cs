using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §12: PayrollEntry is Owner:RA / Prorab:— / Brigadir:R ("своя
// строка") / Accountant:CRUA. Prorab has no access at all — unlike almost
// every other entity, payroll is Owner/Accountant back-office territory,
// not something the on-site Prorab sees. "Своя строка" for Brigadir means
// their own PayrollEntry rows (they're a Worker too, via Worker.UserId),
// not their whole brigade's — a different isolation axis than the
// BrigadeId-based one BrigadirAccess.GetOwnBrigadeIdAsync covers elsewhere.
public sealed record ListPayrollEntriesQuery(int Page, int PageSize) : IRequest<Result<PagedResult<PayrollEntryDto>>>;

public sealed class ListPayrollEntriesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListPayrollEntriesQuery, Result<PagedResult<PayrollEntryDto>>>
{
    public async Task<Result<PagedResult<PayrollEntryDto>>> Handle(ListPayrollEntriesQuery request, CancellationToken cancellationToken)
    {
        var query = context.PayrollEntries.AsQueryable();

        if (currentUser.Role == Role.Brigadir)
        {
            var ownWorkerId = await context.Workers
                .Where(w => w.UserId == currentUser.UserId)
                .Select(w => (Guid?)w.Id)
                .FirstOrDefaultAsync(cancellationToken);

            query = query.Where(e => e.WorkerId == ownWorkerId);
        }

        query = query.OrderByDescending(e => e.PeriodStart);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(PayrollEntryDto.FromEntity).ToList();

        return Result.Success(new PagedResult<PayrollEntryDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
