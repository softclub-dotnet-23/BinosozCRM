using Application.Common.Interfaces;
using Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Application.Workers;

// Mirrors Application.IndividualTasks.BrigadeAccess, one level narrower: a
// Worker is only a User (login) + Worker (Worker.UserId), with no brigade
// management surface — every handler scoping to "my own data" (not "my
// brigade's data") resolves through here instead of BrigadeAccess.
internal static class WorkerAccess
{
    public static Task<Guid?> GetCallerWorkerIdAsync(IApplicationDbContext context, ICurrentUserService currentUser, CancellationToken cancellationToken) =>
        context.Workers
            .Where(w => w.UserId == currentUser.UserId)
            .Select(w => (Guid?)w.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public static async Task<Result<Guid>> GetCallerWorkerIdOrFailureAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        CancellationToken cancellationToken)
    {
        var workerId = await GetCallerWorkerIdAsync(context, currentUser, cancellationToken);
        return workerId is null
            ? Result.Failure<Guid>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."))
            : Result.Success(workerId.Value);
    }
}
