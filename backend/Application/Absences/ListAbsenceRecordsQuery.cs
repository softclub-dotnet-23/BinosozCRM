using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Absences;

// MASTER §9.4: GET /absences — Prorab+, Accountant. No "(own)"/object
// qualifier in §9.4's table (unlike WorkOrder's explicit "(own, read)"),
// and AbsenceRecord has no ObjectId to scope by in the first place — the
// automatic CompanyId filter is the only isolation axis here, same
// judgment call as CreateAbsenceRecordCommand's approval-at-creation
// reading. Company-wide list for any Prorab+/Accountant, not per-object.
public sealed record ListAbsenceRecordsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<AbsenceRecordDto>>>;

public sealed class ListAbsenceRecordsQueryHandler(IApplicationDbContext context, IFileStorageService fileStorage)
    : IRequestHandler<ListAbsenceRecordsQuery, Result<PagedResult<AbsenceRecordDto>>>
{
    public async Task<Result<PagedResult<AbsenceRecordDto>>> Handle(ListAbsenceRecordsQuery request, CancellationToken cancellationToken)
    {
        var query = context.AbsenceRecords.OrderByDescending(a => a.DateFrom).AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(a => AbsenceRecordDto.FromEntity(a, fileStorage)).ToList();

        return Result.Success(new PagedResult<AbsenceRecordDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
