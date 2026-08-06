using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// GET /workers — company-wide (unlike ListBrigadeWorkersQuery, which is scoped to one
// brigade). Owner/Prorab/Accountant, per WorkerDto's own PayRate/Document masking
// (Owner/Accountant see everything, everyone else gets the masked projection).
public sealed record ListWorkersQuery(int Page, int PageSize, bool IncludeInactive = false, Guid? BrigadeId = null)
    : IRequest<Result<PagedResult<WorkerDto>>>;

public sealed class ListWorkersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListWorkersQuery, Result<PagedResult<WorkerDto>>>
{
    public async Task<Result<PagedResult<WorkerDto>>> Handle(ListWorkersQuery request, CancellationToken cancellationToken)
    {
        var query = context.Workers.AsQueryable();

        if (!request.IncludeInactive)
            query = query.Where(w => w.IsActive);

        if (request.BrigadeId is { } brigadeId)
            query = query.Where(w => w.BrigadeId == brigadeId);

        query = query.OrderBy(w => w.FullName);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(w => WorkerDto.FromEntity(w, currentUser.Role)).ToList();

        return Result.Success(new PagedResult<WorkerDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
