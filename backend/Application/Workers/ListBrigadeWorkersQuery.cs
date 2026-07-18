using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

public sealed record ListBrigadeWorkersQuery(Guid BrigadeId, int Page, int PageSize) : IRequest<Result<PagedResult<WorkerDto>>>;

public sealed class ListBrigadeWorkersQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ListBrigadeWorkersQuery, Result<PagedResult<WorkerDto>>>
{
    public async Task<Result<PagedResult<WorkerDto>>> Handle(ListBrigadeWorkersQuery request, CancellationToken cancellationToken)
    {
        var brigadeExists = await context.Brigades.AnyAsync(b => b.Id == request.BrigadeId, cancellationToken);
        if (!brigadeExists)
            return Result.Failure<PagedResult<WorkerDto>>(new Error("BRIGADE_NOT_FOUND", "Brigade not found."));

        var query = context.Workers
            .Where(w => w.BrigadeId == request.BrigadeId)
            .OrderBy(w => w.FullName);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(w => WorkerDto.FromEntity(w, currentUser.Role)).ToList();

        return Result.Success(new PagedResult<WorkerDto>(dtos, request.Page, request.PageSize, totalCount));
    }
}
