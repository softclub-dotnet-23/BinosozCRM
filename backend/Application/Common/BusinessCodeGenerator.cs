using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Application.Common;

// MASTER §5.11/§5.14: WorkOrder.Code and IndividualTask.Code share one
// numbering sequence per company ("IndividualTask: Code — та же
// последовательность, что WorkOrder") — both entity types are queried
// together so neither hands out a number the other already used.
internal static class BusinessCodeGenerator
{
    private const string Prefix = "BR-";

    // Best-effort MAX+1, not a DB sequence — a race between two concurrent
    // creates (of either entity type) in the same company could compute the
    // same N. The unique (CompanyId, Code) index on both tables turns that
    // into a clean DbUpdateException rather than silent data corruption;
    // callers should retry on it rather than surface a raw 500.
    public static async Task<string> NextCodeAsync(IApplicationDbContext context, Guid companyId, CancellationToken cancellationToken)
    {
        var workOrderCodes = await context.WorkOrders
            .Where(w => w.CompanyId == companyId)
            .Select(w => w.Code)
            .ToListAsync(cancellationToken);

        var individualTaskCodes = await context.IndividualTasks
            .Where(t => t.CompanyId == companyId)
            .Select(t => t.Code)
            .ToListAsync(cancellationToken);

        var maxN = workOrderCodes.Concat(individualTaskCodes)
            .Select(ParseNumber)
            .DefaultIfEmpty(0)
            .Max();

        return $"{Prefix}{maxN + 1}";
    }

    private static int ParseNumber(string code) =>
        code.StartsWith(Prefix, StringComparison.Ordinal) && int.TryParse(code.AsSpan(Prefix.Length), out var n) ? n : 0;
}
