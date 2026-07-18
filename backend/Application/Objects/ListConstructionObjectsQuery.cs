using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

public sealed record ListConstructionObjectsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<ConstructionObjectDto>>>;

public sealed class ListConstructionObjectsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListConstructionObjectsQuery, Result<PagedResult<ConstructionObjectDto>>>
{
    public async Task<Result<PagedResult<ConstructionObjectDto>>> Handle(ListConstructionObjectsQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.ConstructionObjects.AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(o => allowedObjectIds.Contains(o.Id));

        query = query.OrderBy(o => o.Name);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(ConstructionObjectDto.FromEntity).ToList();

        return Result.Success(new PagedResult<ConstructionObjectDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
