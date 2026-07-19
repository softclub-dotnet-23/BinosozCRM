using Application.Common;
using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

public sealed record ListTimesheetsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<TimesheetDto>>>;

public sealed class ListTimesheetsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListTimesheetsQuery, Result<PagedResult<TimesheetDto>>>
{
    public async Task<Result<PagedResult<TimesheetDto>>> Handle(ListTimesheetsQuery request, CancellationToken cancellationToken)
    {
        var query = context.Timesheets.AsQueryable();

        if (currentUser.Role == Role.Brigadir)
        {
            var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
            query = query.Where(t => context.Workers.Any(w => w.Id == t.WorkerId && w.BrigadeId == ownBrigadeId));
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null)
                query = query.Where(t => allowedObjectIds.Contains(t.ObjectId));
        }

        query = query.OrderByDescending(t => t.Date);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(TimesheetDto.FromEntity).ToList();

        return Result.Success(new PagedResult<TimesheetDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
