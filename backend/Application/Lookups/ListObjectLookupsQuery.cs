using Application.Common.Interfaces;
using Application.IndividualTasks;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Lookups;

public sealed record ListObjectLookupsQuery(IReadOnlyCollection<Guid>? Ids, string? Search, int Limit)
    : IRequest<Result<IReadOnlyList<LookupItemDto>>>;

public sealed class ListObjectLookupsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListObjectLookupsQuery, Result<IReadOnlyList<LookupItemDto>>>
{
    private const int MaximumLimit = 100;

    public async Task<Result<IReadOnlyList<LookupItemDto>>> Handle(
        ListObjectLookupsQuery request,
        CancellationToken cancellationToken)
    {
        var query = context.ConstructionObjects.AsNoTracking().AsQueryable();

        switch (currentUser.Role)
        {
            case Role.Owner:
                break;

            case Role.Prorab:
            {
                var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
                if (allowedObjectIds is not null)
                    query = query.Where(constructionObject => allowedObjectIds.Contains(constructionObject.Id));
                break;
            }

            case Role.Brigadir:
            {
                var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
                if (brigadeId is null)
                {
                    return Result.Failure<IReadOnlyList<LookupItemDto>>(
                        new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));
                }

                // There is no separate Brigade-to-Object assignment entity.
                // WorkOrder is the authoritative existing object assignment for
                // a brigade, and using it as a subquery keeps this a single
                // bounded database projection rather than a query per object.
                var ownBrigadeObjectIds = context.WorkOrders
                    .AsNoTracking()
                    .Where(workOrder => workOrder.BrigadeId == brigadeId.Value)
                    .Select(workOrder => workOrder.ObjectId);

                query = query.Where(constructionObject => ownBrigadeObjectIds.Contains(constructionObject.Id));
                break;
            }

            default:
                return Result.Failure<IReadOnlyList<LookupItemDto>>(
                    new Error("OBJECT_NOT_FOUND", "Object lookup is not available."));
        }

        var ids = request.Ids?
            .Where(id => id != Guid.Empty)
            .Distinct()
            .Take(MaximumLimit)
            .ToArray();
        if (ids is { Length: > 0 })
            query = query.Where(constructionObject => ids.Contains(constructionObject.Id));

        var search = request.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var normalizedSearch = search.ToLowerInvariant();
            query = query.Where(constructionObject => constructionObject.Name.ToLower().Contains(normalizedSearch));
        }

        var limit = Math.Clamp(request.Limit, 1, MaximumLimit);
        var items = await query
            .OrderBy(constructionObject => constructionObject.Name)
            .ThenBy(constructionObject => constructionObject.Id)
            .Select(constructionObject => new LookupItemDto(constructionObject.Id, constructionObject.Name))
            .Take(limit)
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<LookupItemDto>>(items);
    }
}
