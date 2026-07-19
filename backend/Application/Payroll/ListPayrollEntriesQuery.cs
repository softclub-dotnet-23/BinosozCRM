using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §9.4: GET /payroll — Accountant, Owner. Company-wide (the
// automatic CompanyId global query filter is the only isolation axis
// here — payroll isn't object- or brigade-scoped like Prorab/Brigadir
// data).
public sealed record ListPayrollEntriesQuery(int Page, int PageSize) : IRequest<Result<PagedResult<PayrollEntryDto>>>;

public sealed class ListPayrollEntriesQueryHandler(IApplicationDbContext context)
    : IRequestHandler<ListPayrollEntriesQuery, Result<PagedResult<PayrollEntryDto>>>
{
    public async Task<Result<PagedResult<PayrollEntryDto>>> Handle(ListPayrollEntriesQuery request, CancellationToken cancellationToken)
    {
        var query = context.PayrollEntries.OrderByDescending(p => p.PeriodStart).AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(PayrollEntryDto.FromEntity).ToList();

        return Result.Success(new PagedResult<PayrollEntryDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
