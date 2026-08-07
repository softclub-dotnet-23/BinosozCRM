using Application.Common.Interfaces;
using Application.Common.Models;
using Application.IndividualTasks;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// Frontend-integration: GET /brigades/mine/workers — Brigadir only. Not the same thing as
// GetOwnWorkerProfileQuery (that's the caller's own single Worker record, GET /workers/me) or
// GetMyBrigadeQuery (the Brigade record itself, GET /brigades/mine) — this is the caller's own
// crew *roster*, which neither of those returns. Resolves "their own brigade" the same way
// IndividualTasks/BrigadeAccess.cs and Brigades/GetMyBrigadeQuery.cs already do — a Brigadir is
// simultaneously a User (login) and a Worker (listed in their own brigade via Worker.UserId).
public sealed record ListMyBrigadeWorkersQuery(int Page, int PageSize) : IRequest<Result<PagedResult<WorkerDto>>>;

public sealed class ListMyBrigadeWorkersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMyBrigadeWorkersQuery, Result<PagedResult<WorkerDto>>>
{
    public async Task<Result<PagedResult<WorkerDto>>> Handle(ListMyBrigadeWorkersQuery request, CancellationToken cancellationToken)
    {
        var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (brigadeId is null)
            return Result.Failure<PagedResult<WorkerDto>>(new Error("WORKER_NOT_FOUND", "No worker row linked to the caller."));

        var query = context.Workers.Where(w => w.BrigadeId == brigadeId && w.IsActive).OrderBy(w => w.FullName);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(w => WorkerDto.FromEntity(w, currentUser.Role)).ToList();

        return Result.Success(new PagedResult<WorkerDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
