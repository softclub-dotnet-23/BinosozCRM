using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Brigades;

public sealed record GetMyBrigadeQuery : IRequest<Result<BrigadeDto>>;

public sealed class GetMyBrigadeQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetMyBrigadeQuery, Result<BrigadeDto>>
{
    public async Task<Result<BrigadeDto>> Handle(GetMyBrigadeQuery request, CancellationToken cancellationToken)
    {
        var brigade = await (
            from worker in context.Workers
            join candidate in context.Brigades on worker.BrigadeId equals candidate.Id
            where worker.UserId == currentUser.UserId
            select candidate)
            .FirstOrDefaultAsync(cancellationToken);

        return brigade is null
            ? Result.Failure<BrigadeDto>(new Error("BRIGADE_NOT_FOUND", "No brigade is linked to this account."))
            : Result.Success(BrigadeDto.FromEntity(brigade));
    }
}