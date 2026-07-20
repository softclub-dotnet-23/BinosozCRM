using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §9.4: GET,POST /individual-tasks — Brigadir, own brigade only.
public sealed record ListIndividualTasksQuery(int Page, int PageSize) : IRequest<Result<PagedResult<IndividualTaskDto>>>;

public sealed class ListIndividualTasksQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListIndividualTasksQuery, Result<PagedResult<IndividualTaskDto>>>
{
    public async Task<Result<PagedResult<IndividualTaskDto>>> Handle(ListIndividualTasksQuery request, CancellationToken cancellationToken)
    {
        var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (callerBrigadeId is null)
            return Result.Failure<PagedResult<IndividualTaskDto>>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        var query = context.IndividualTasks
            .Where(t => t.BrigadeId == callerBrigadeId.Value)
            .OrderBy(t => t.Code);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(IndividualTaskDto.FromEntity).ToList();

        return Result.Success(new PagedResult<IndividualTaskDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
