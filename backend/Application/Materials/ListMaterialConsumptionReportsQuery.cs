using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4: GET /material-consumption-reports — Prorab+(R) only, per
// §9.4's literal "Brigadir(C) / Prorab+(R)" split (unlike WorkOrder's own
// "(own, read)" carve-out for Brigadir, there's no Brigadir read path
// annotated for this one). §8.2: "Прораб видит не только заявку, но и
// историю отчётов" — scoped by ProrabObjectAssignment on ObjectId, same
// pattern as every other Prorab+ list in this codebase.
public sealed record ListMaterialConsumptionReportsQuery(int Page, int PageSize)
    : IRequest<Result<PagedResult<MaterialConsumptionReportDto>>>;

public sealed class ListMaterialConsumptionReportsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListMaterialConsumptionReportsQuery, Result<PagedResult<MaterialConsumptionReportDto>>>
{
    public async Task<Result<PagedResult<MaterialConsumptionReportDto>>> Handle(ListMaterialConsumptionReportsQuery request, CancellationToken cancellationToken)
    {
        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);

        var query = context.MaterialConsumptionReports.AsQueryable();
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
