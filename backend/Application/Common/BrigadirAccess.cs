using Application.Common.Interfaces;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common;

// MASTER §11.5 rule 2: BrigadeId isolation for Brigadir is manual, never an
// EF global filter. Shared between WorkOrder and IndividualTask handlers
// (both need "what's my own brigade") so the lookup lives in one place
// instead of being copy-pasted, risking the missed-check 🔴 AGENTS.md warns
// about.
internal static class BrigadirAccess
{
    // A Brigadir "числится в своей бригаде" via Worker.UserId (§4's role
    // description) — there's no direct User -> Brigade link, only through
    // the Worker row. Null if the current user isn't a Brigadir, or has no
    // matching Worker row yet.
    public static async Task<Guid?> GetOwnBrigadeIdAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        CancellationToken cancellationToken)
    {
        if (currentUser.Role != Role.Brigadir)
            return null;

        return await context.Workers
            .Where(w => w.UserId == currentUser.UserId)
            .Select(w => (Guid?)w.BrigadeId)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
