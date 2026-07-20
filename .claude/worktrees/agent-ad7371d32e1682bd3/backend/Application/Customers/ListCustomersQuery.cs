using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Customers;

public sealed record ListCustomersQuery(int Page, int PageSize) : IRequest<Result<PagedResult<CustomerDto>>>;

public sealed class ListCustomersQueryHandler(IApplicationDbContext context)
    : IRequestHandler<ListCustomersQuery, Result<PagedResult<CustomerDto>>>
{
    public async Task<Result<PagedResult<CustomerDto>>> Handle(ListCustomersQuery request, CancellationToken cancellationToken)
    {
        var query = context.Customers.OrderBy(c => c.Name);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(CustomerDto.FromEntity).ToList();

        return Result.Success(new PagedResult<CustomerDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
