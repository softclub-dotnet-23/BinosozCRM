using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// New (Worker-dashboard checkpoint, docs/PROGRESS.md): WorkOrderProgress had
// a POST but no list/GET route at all, for any role — this closes that gap.
// Scoped to the caller's own submitted reports (ReportedByUserId == self),
// not per-WorkOrder — used for both the "Фотоотчёты" KPI (count + latest)
// and WorkerPhotoReportsPage's history table, replacing its previous
// session-only fake list.
public sealed record ListMyWorkOrderProgressQuery(int Page, int PageSize) : IRequest<Result<PagedResult<WorkOrderProgressDto>>>;

public sealed class ListMyWorkOrderProgressQueryHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IFileStorageService fileStorage)
    : IRequestHandler<ListMyWorkOrderProgressQuery, Result<PagedResult<WorkOrderProgressDto>>>
{
    public async Task<Result<PagedResult<WorkOrderProgressDto>>> Handle(ListMyWorkOrderProgressQuery request, CancellationToken cancellationToken)
    {
        var query = context.WorkOrderProgresses
            .Where(p => p.ReportedByUserId == currentUser.UserId)
            .OrderByDescending(p => p.ReportedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(p => WorkOrderProgressDto.FromEntity(p, fileStorage)).ToList();

        return Result.Success(new PagedResult<WorkOrderProgressDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
