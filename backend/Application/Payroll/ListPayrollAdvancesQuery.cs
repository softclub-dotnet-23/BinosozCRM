using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Payroll;

// MASTER §9.4: GET /payroll-advances — Accountant, Owner. Company-wide,
// same reasoning as GET /payroll.
public sealed record ListPayrollAdvancesQuery(int Page, int PageSize) : IRequest<Result<PagedResult<PayrollAdvanceDto>>>;

public sealed class ListPayrollAdvancesQueryHandler(IApplicationDbContext context)
    : IRequestHandler<ListPayrollAdvancesQuery, Result<PagedResult<PayrollAdvanceDto>>>
{
    public async Task<Result<PagedResult<PayrollAdvanceDto>>> Handle(ListPayrollAdvancesQuery request, CancellationToken cancellationToken)
    {
        var query = context.PayrollAdvances.OrderByDescending(a => a.IssuedAt).AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(PayrollAdvanceDto.FromEntity).ToList();

        return Result.Success(new PagedResult<PayrollAdvanceDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
