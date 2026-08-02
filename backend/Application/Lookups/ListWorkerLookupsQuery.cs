using Application.Common.Interfaces;
using Application.IndividualTasks;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Lookups;

public sealed record ListWorkerLookupsQuery(IReadOnlyCollection<Guid>? Ids, string? Search, int Limit)
    : IRequest<Result<IReadOnlyList<LookupItemDto>>>;

public sealed class ListWorkerLookupsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListWorkerLookupsQuery, Result<IReadOnlyList<LookupItemDto>>>
{
    private const int MaximumLimit = 100;

    public async Task<Result<IReadOnlyList<LookupItemDto>>> Handle(
        ListWorkerLookupsQuery request,
        CancellationToken cancellationToken)
    {
        var query = context.Workers.AsNoTracking().AsQueryable();

        switch (currentUser.Role)
        {
            case Role.Owner:
                break;

            case Role.Prorab:
                // Existing Worker APIs allow a Prorab to work with workers
                // throughout their company. There is no Worker-to-Object
                // relationship in the domain to narrow this further, so this
                // preserves (rather than silently changes) that established
                // business scope. The DbContext company filter still applies.
                break;

            case Role.Brigadir:
            case Role.Worker:
            {
                var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
                if (brigadeId is null)
                {
                    return Result.Failure<IReadOnlyList<LookupItemDto>>(
                        new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));
                }

                query = query.Where(worker => worker.BrigadeId == brigadeId.Value);
                break;
            }

            default:
                // The HTTP endpoint rejects unsupported roles before MediatR.
                // Keep direct handler use fail-closed as well.
                return Result.Failure<IReadOnlyList<LookupItemDto>>(
                    new Error("WORKER_NOT_FOUND", "Worker lookup is not available."));
        }

        var ids = request.Ids?
            .Where(id => id != Guid.Empty)
            .Distinct()
            .Take(MaximumLimit)
            .ToArray();
        if (ids is { Length: > 0 })
            query = query.Where(worker => ids.Contains(worker.Id));

        var search = request.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var normalizedSearch = search.ToLowerInvariant();
            query = query.Where(worker => worker.FullName.ToLower().Contains(normalizedSearch));
        }

        var limit = Math.Clamp(request.Limit, 1, MaximumLimit);
        var items = await query
            .OrderBy(worker => worker.FullName)
            .ThenBy(worker => worker.Id)
            .Select(worker => new LookupItemDto(worker.Id, worker.FullName))
            .Take(limit)
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<LookupItemDto>>(items);
    }
}
