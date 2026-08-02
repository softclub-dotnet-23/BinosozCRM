using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Workers;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §9.4: GET,POST /individual-tasks — Brigadir, own brigade. Worker
// (added post-MASTER, see PROGRESS.md Worker-role checkpoint) is narrower
// still: only tasks assigned to their own Worker row, not their whole
// brigade's.
public sealed record ListIndividualTasksQuery(int Page, int PageSize) : IRequest<Result<PagedResult<IndividualTaskDto>>>;

public sealed class ListIndividualTasksQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListIndividualTasksQuery, Result<PagedResult<IndividualTaskDto>>>
{
    public async Task<Result<PagedResult<IndividualTaskDto>>> Handle(ListIndividualTasksQuery request, CancellationToken cancellationToken)
    {
        var query = context.IndividualTasks.AsQueryable();

        if (currentUser.Role == Role.Worker)
        {
            var ownWorkerId = await WorkerAccess.GetCallerWorkerIdAsync(context, currentUser, cancellationToken);
            if (ownWorkerId is null)
                return Result.Failure<PagedResult<IndividualTaskDto>>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

            query = query.Where(t => t.AssignedToWorkerId == ownWorkerId.Value);
        }
        else
        {
            var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
            if (callerBrigadeId is null)
                return Result.Failure<PagedResult<IndividualTaskDto>>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

            query = query.Where(t => t.BrigadeId == callerBrigadeId.Value);
        }

        query = query.OrderBy(t => t.Code);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(IndividualTaskDto.FromEntity).ToList();

        return Result.Success(new PagedResult<IndividualTaskDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
