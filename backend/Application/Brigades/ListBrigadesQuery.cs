using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

public sealed record ListBrigadesQuery(int Page, int PageSize) : IRequest<Result<PagedResult<BrigadeDto>>>;

public sealed class ListBrigadesQueryHandler(IApplicationDbContext context)
    : IRequestHandler<ListBrigadesQuery, Result<PagedResult<BrigadeDto>>>
{
    public async Task<Result<PagedResult<BrigadeDto>>> Handle(ListBrigadesQuery request, CancellationToken cancellationToken)
    {
        var query = context.Brigades.OrderBy(b => b.Name);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(BrigadeDto.FromEntity).ToList();

        return Result.Success(new PagedResult<BrigadeDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
