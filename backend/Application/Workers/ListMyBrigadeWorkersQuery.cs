using Application.Common.Interfaces;
using Application.Common.Models;
using Application.IndividualTasks;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// GET /brigades/mine/workers — Brigadir only. WorkersController's brigade-scoped list
// (GET /brigades/{id}/workers) is Owner,Prorab only; a Brigadir has no route that gives them
// their own crew roster at all today. Resolves "their own brigade" the same way
// IndividualTasks/BrigadeAccess.cs already does for the Brigadir's own tasks/timesheets.
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
