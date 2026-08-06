using Application.Common.Interfaces;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// MASTER §1.2 / §11.5 rule 3: ProrabObjectAssignment isolation is manual,
// not an EF global filter — every handler that reads/writes a specific
// ConstructionObject (or something scoped under one) must apply this.
// A missed check here is exactly the "🔴, not a suggestion" AGENTS.md warns
// about, so the lookup lives in one place instead of being copy-pasted into
// every handler.
internal static class ProrabObjectAccess
{
    // Returns null when the caller can see every object — Owner, or a Prorab
    // with zero ProrabObjectAssignment rows (§1.2's explicit default: no
    // assignments = sees all, so one prorab works with zero setup). Returns
    // the allowed set once the Prorab has at least one assignment — from
    // that point on it's a strict allow-list.
    public static async Task<List<Guid>?> GetAllowedObjectIdsAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        CancellationToken cancellationToken)
    {
        if (currentUser.Role != Role.Prorab)
            return null;

        var assignedObjectIds = await context.ProrabObjectAssignments
            .Where(a => a.ProrabUserId == currentUser.UserId)
            .Select(a => a.ObjectId)
            .ToListAsync(cancellationToken);

        return assignedObjectIds.Count > 0 ? assignedObjectIds : null;
    }
}
