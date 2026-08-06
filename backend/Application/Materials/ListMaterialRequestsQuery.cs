using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4: GET /material-requests — Prorab+(R) only, same literal
// "Brigadir(C) / Prorab+(R)" split as material-consumption-reports.
public sealed record ListMaterialRequestsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<MaterialRequestDto>>>;

public sealed class ListMaterialRequestsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMaterialRequestsQuery, Result<PagedResult<MaterialRequestDto>>>
{
    public async Task<Result<PagedResult<MaterialRequestDto>>> Handle(ListMaterialRequestsQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.MaterialRequests.AsQueryable();
        if (allowedObjectIds is not null)
            query = query.Where(r => allowedObjectIds.Contains(r.ObjectId));

        query = query.OrderByDescending(r => r.RequestedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MaterialRequestDto.FromEntity).ToList();

        return Result.Success(new PagedResult<MaterialRequestDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
