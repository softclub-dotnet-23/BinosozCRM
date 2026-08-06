using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// MASTER §9.4: GET /objects/{id}/prorabs — Owner only.
public sealed record ListObjectProrabsQuery(Guid ObjectId, int Page, int PageSize) : IRequest<Result<PagedResult<ProrabAssignmentDto>>>;

public sealed class ListObjectProrabsQueryHandler(IApplicationDbContext context)
    : IRequestHandler<ListObjectProrabsQuery, Result<PagedResult<ProrabAssignmentDto>>>
{
    public async Task<Result<PagedResult<ProrabAssignmentDto>>> Handle(ListObjectProrabsQuery request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<PagedResult<ProrabAssignmentDto>>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var query = context.ProrabObjectAssignments
            .Where(a => a.ObjectId == request.ObjectId)
            .OrderBy(a => a.AssignedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(ProrabAssignmentDto.FromEntity).ToList();

        return Result.Success(new PagedResult<ProrabAssignmentDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
