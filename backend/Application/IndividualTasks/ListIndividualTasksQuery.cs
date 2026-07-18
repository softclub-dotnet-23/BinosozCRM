using Application.Common;
using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §9.4 lists GET,POST /individual-tasks as Brigadir-only — §12's role
// matrix gives Owner/Prorab "R" too, but no endpoint is named for it. Same
// recurring gap as Worker/WorkOrder; not built here, flagged instead.
public sealed record ListIndividualTasksQuery(int Page, int PageSize) : IRequest<Result<PagedResult<IndividualTaskDto>>>;

public sealed class ListIndividualTasksQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListIndividualTasksQuery, Result<PagedResult<IndividualTaskDto>>>
{
    public async Task<Result<PagedResult<IndividualTaskDto>>> Handle(ListIndividualTasksQuery request, CancellationToken cancellationToken)
    {
        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);

        var query = context.IndividualTasks
            .Where(t => t.BrigadeId == ownBrigadeId)
            .OrderByDescending(t => t.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(IndividualTaskDto.FromEntity).ToList();

        return Result.Success(new PagedResult<IndividualTaskDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
