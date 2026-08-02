using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4: GET /material-requests — Prorab+(R) only, same literal
// "Brigadir(C) / Prorab+(R)" split as material-consumption-reports. Worker
// (post-MASTER addition, docs/PROGRESS.md) and Brigadir get a narrower
// "own requests" read added alongside it — RequestedByUserId == self —
// rather than the object-wide Prorab+ view.
public sealed record ListMaterialRequestsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<MaterialRequestDto>>>;

public sealed class ListMaterialRequestsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMaterialRequestsQuery, Result<PagedResult<MaterialRequestDto>>>
{
    public async Task<Result<PagedResult<MaterialRequestDto>>> Handle(ListMaterialRequestsQuery request, CancellationToken cancellationToken)
    {
        var query = context.MaterialRequests.AsQueryable();

        if (currentUser.Role is Role.Brigadir or Role.Worker)
        {
            query = query.Where(r => r.RequestedByUserId == currentUser.UserId);
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null)
                query = query.Where(r => allowedObjectIds.Contains(r.ObjectId));
        }

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
