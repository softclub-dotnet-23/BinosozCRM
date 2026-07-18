using Application.Common.Interfaces;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §11.5 rule 2/3: BrigadeId (Brigadir) and ProrabObjectAssignment
// (Prorab) isolation are both manual — never an EF global filter. Centralized
// here so every WorkOrder handler applies the same check the same way,
// instead of each one re-deriving it (and risking the missed-check 🔴
// AGENTS.md warns about).
internal static class WorkOrderAccess
{
    // A Brigadir "числится в своей бригаде" via Worker.UserId (§4's role
    // description) — there's no direct User -> Brigade link, only through
    // the Worker row. Null if the current user isn't a Brigadir, or has no
    // matching Worker row yet.
    public static async Task<Guid?> GetBrigadirOwnBrigadeIdAsync(
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
