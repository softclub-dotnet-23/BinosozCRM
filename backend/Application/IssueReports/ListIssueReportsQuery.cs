using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IssueReports;

// Same split as ListMaterialRequestsQuery: Prorab+ sees every report on an
// object they're assigned to (or every object, if unrestricted); Brigadir/
// Worker sees only their own reported ones.
public sealed record ListIssueReportsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<IssueReportDto>>>;

public sealed class ListIssueReportsQueryHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IFileStorageService fileStorage)
    : IRequestHandler<ListIssueReportsQuery, Result<PagedResult<IssueReportDto>>>
{
    public async Task<Result<PagedResult<IssueReportDto>>> Handle(ListIssueReportsQuery request, CancellationToken cancellationToken)
    {
        var query = context.IssueReports.AsQueryable();

        if (currentUser.Role is Role.Brigadir or Role.Worker)
        {
            query = query.Where(r => r.ReportedByUserId == currentUser.UserId);
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null)
                query = query.Where(r => allowedObjectIds.Contains(r.ObjectId));
        }

        query = query.OrderByDescending(r => r.ReportedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(r => IssueReportDto.FromEntity(r, fileStorage)).ToList();

        return Result.Success(new PagedResult<IssueReportDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
