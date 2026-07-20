using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.PayrollAdvances;

// MASTER §12: PayrollAdvance is Owner:CRUA / Prorab:— / Brigadir:R ("свои")
// / Accountant:CRUA — same shape as PayrollEntry (Step 3): Prorab has no
// access at all, and "own" for Brigadir means their own advances (they're
// a Worker too, via Worker.UserId), not their brigade's.
public sealed record ListPayrollAdvancesQuery(int Page, int PageSize) : IRequest<Result<PagedResult<PayrollAdvanceDto>>>;

public sealed class ListPayrollAdvancesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListPayrollAdvancesQuery, Result<PagedResult<PayrollAdvanceDto>>>
{
    public async Task<Result<PagedResult<PayrollAdvanceDto>>> Handle(ListPayrollAdvancesQuery request, CancellationToken cancellationToken)
    {
        var query = context.PayrollAdvances.AsQueryable();

        if (currentUser.Role == Role.Brigadir)
        {
            var ownWorkerId = await context.Workers
                .Where(w => w.UserId == currentUser.UserId)
                .Select(w => (Guid?)w.Id)
                .FirstOrDefaultAsync(cancellationToken);

            query = query.Where(a => a.WorkerId == ownWorkerId);
        }

        query = query.OrderByDescending(a => a.IssuedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(PayrollAdvanceDto.FromEntity).ToList();

        return Result.Success(new PagedResult<PayrollAdvanceDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
