using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// No ProrabObjectAssignment filtering yet — that's Phase 1 Step 4's scope
// (MASTER §1.2). Every Prorab+ caller sees every object in the company until
// then, same "default: no assignments = sees all" the step itself describes.
public sealed record ListConstructionObjectsQuery(int Page, int PageSize) : IRequest<Result<PagedResult<ConstructionObjectDto>>>;

public sealed class ListConstructionObjectsQueryHandler(IApplicationDbContext context)
    : IRequestHandler<ListConstructionObjectsQuery, Result<PagedResult<ConstructionObjectDto>>>
{
    public async Task<Result<PagedResult<ConstructionObjectDto>>> Handle(ListConstructionObjectsQuery request, CancellationToken cancellationToken)
    {
        var query = context.ConstructionObjects.OrderBy(o => o.Name);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(ConstructionObjectDto.FromEntity).ToList();

        return Result.Success(new PagedResult<ConstructionObjectDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
