using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialConsumptionReports;

// MASTER §9.4: "GET,POST /material-consumption-reports Brigadir(C) /
// Prorab+(R)" — read is Prorab+ only, literally, no Brigadir(own) the way
// Timesheet's GET has. Not building a Brigadir read-back beyond what's stated.
public sealed record ListMaterialConsumptionReportsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<MaterialConsumptionReportDto>>>;

public sealed class ListMaterialConsumptionReportsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMaterialConsumptionReportsQuery, Result<PagedResult<MaterialConsumptionReportDto>>>
{
    public async Task<Result<PagedResult<MaterialConsumptionReportDto>>> Handle(
        ListMaterialConsumptionReportsQuery request, CancellationToken cancellationToken)
    {
        var query = context.MaterialConsumptionReports.AsQueryable();

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null)
            query = query.Where(r => allowedObjectIds.Contains(r.ObjectId));

        query = query.OrderByDescending(r => r.Date);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MaterialConsumptionReportDto.FromEntity).ToList();

        return Result.Success(new PagedResult<MaterialConsumptionReportDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
