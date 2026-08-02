using Application.Common.Interfaces;
using Application.Common.Models;
using Application.IndividualTasks;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

public sealed record GetMyBrigadeQuery() : IRequest<Result<BrigadeDto>>;

public sealed class GetMyBrigadeQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetMyBrigadeQuery, Result<BrigadeDto>>
{
    public async Task<Result<BrigadeDto>> Handle(GetMyBrigadeQuery request, CancellationToken cancellationToken)
    {
        var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (brigadeId is null)
            return Result.Failure<BrigadeDto>(new Error("WORKER_NOT_FOUND", "No brigade linked to this account."));

        var brigade = await context.Brigades
            .Where(b => b.Id == brigadeId)
            .OrderBy(b => b.Name)
            .FirstOrDefaultAsync(cancellationToken);

        if (brigade is null)
            return Result.Failure<BrigadeDto>(new Error("WORKER_NOT_FOUND", "No brigade linked to this account."));

        return Result.Success(BrigadeDto.FromEntity(brigade));
    }
}
