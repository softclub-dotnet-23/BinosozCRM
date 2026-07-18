using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

public sealed record ListEstimateItemsQuery(Guid ObjectId, int Page, int PageSize) : IRequest<Result<PagedResult<EstimateItemDto>>>;

public sealed class ListEstimateItemsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListEstimateItemsQuery, Result<PagedResult<EstimateItemDto>>>
{
    public async Task<Result<PagedResult<EstimateItemDto>>> Handle(ListEstimateItemsQuery request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<PagedResult<EstimateItemDto>>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<PagedResult<EstimateItemDto>>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var query = context.EstimateItems
            .Where(e => e.ObjectId == request.ObjectId)
            .OrderBy(e => e.WorkType);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(EstimateItemDto.FromEntity).ToList();

        return Result.Success(new PagedResult<EstimateItemDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
