using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §11.5 rule 2: BrigadeId isolation for Brigadir is manual, not an EF
// global filter — every handler touching IndividualTask must apply this. A
// missed check here is exactly the "🔴, not a suggestion" AGENTS.md warns
// about, so the lookup lives in one place (mirrors ProrabObjectAccess for
// the Prorab/object case).
internal static class BrigadeAccess
{
    // §4: a Brigadir is simultaneously a User (login) and a Worker (listed
    // in their own brigade via Worker.UserId) — resolves "their own brigade"
    // from that link. Null means the caller has no linked Worker row at all.
    public static Task<Guid?> GetCallerBrigadeIdAsync(IApplicationDbContext context, ICurrentUserService currentUser, CancellationToken cancellationToken) =>
        context.Workers
            .Where(w => w.UserId == currentUser.UserId)
            .Select(w => (Guid?)w.BrigadeId)
            .FirstOrDefaultAsync(cancellationToken);
}
