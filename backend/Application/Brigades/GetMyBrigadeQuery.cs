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

        // MASTER §4: a Brigadir is simultaneously a User (login) and a
        // Worker (listed in their own brigade via Worker.UserId) — resolve
        // their display name the same way BrigadeAccess resolves "own
        // brigade": through the linked Worker row, not a direct User lookup
        // (Worker-dashboard checkpoint, docs/PROGRESS.md — the shift card
        // needs a human-readable brigadir name, not just a raw Guid).
        var brigadirFullName = brigade.BrigadirUserId is null
            ? null
            : await context.Workers
                .Where(w => w.UserId == brigade.BrigadirUserId)
                .Select(w => w.FullName)
                .FirstOrDefaultAsync(cancellationToken);

        return Result.Success(BrigadeDto.FromEntity(brigade, brigadirFullName));
    }
}
