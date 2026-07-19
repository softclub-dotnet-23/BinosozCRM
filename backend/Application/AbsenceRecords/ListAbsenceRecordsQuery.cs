using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.AbsenceRecords;

// MASTER §9.4: GET,POST /absences — Prorab+, Accountant, no "(own)"
// qualifier the way Timesheet's Brigadir row has one. AbsenceRecord has no
// ObjectId/BrigadeId of its own to filter by (it's Worker-scoped, an HR
// record, not tied to a site) — no isolation filter is applied here.
public sealed record ListAbsenceRecordsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<AbsenceRecordDto>>>;

public sealed class ListAbsenceRecordsQueryHandler(IApplicationDbContext context, IPhotoStorageService photoStorage)
    : IRequestHandler<ListAbsenceRecordsQuery, Result<PagedResult<AbsenceRecordDto>>>
{
    public async Task<Result<PagedResult<AbsenceRecordDto>>> Handle(ListAbsenceRecordsQuery request, CancellationToken cancellationToken)
    {
        var query = context.AbsenceRecords.OrderByDescending(a => a.DateFrom);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(a => AbsenceRecordDto.FromEntity(a, photoStorage)).ToList();

        return Result.Success(new PagedResult<AbsenceRecordDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
