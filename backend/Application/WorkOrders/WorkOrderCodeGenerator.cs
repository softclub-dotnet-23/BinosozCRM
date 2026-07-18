using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §5.11/§5.14: IndividualTask.Code shares this exact sequence
// ("та же последовательность, что WorkOrder") — once Phase 2 Step 2 gives
// IndividualTask an Application layer, its code generation must also
// consider WorkOrder.Code (and vice versa becomes irrelevant only if this
// helper is reused directly), or the two will hand out duplicate numbers.
// Only WorkOrder exists as of this step, so only WorkOrder.Code is queried
// here — flagged for Step 2, not a silent gap.
internal static class WorkOrderCodeGenerator
{
    private const string Prefix = "BR-";

    // Best-effort MAX+1, not a DB sequence — a race between two concurrent
    // creates in the same company could compute the same N. The unique
    // index on (CompanyId, Code) (WorkOrderConfiguration) turns that into a
    // clean conflict rather than silent data corruption; callers should
    // retry on a unique-violation rather than surface it as a 500.
    public static async Task<string> NextCodeAsync(IApplicationDbContext context, Guid companyId, CancellationToken cancellationToken)
    {
        var codes = await context.WorkOrders
            .Where(w => w.CompanyId == companyId)
            .Select(w => w.Code)
            .ToListAsync(cancellationToken);

        var maxN = codes
            .Select(ParseNumber)
            .DefaultIfEmpty(0)
            .Max();

        return $"{Prefix}{maxN + 1}";
    }

    private static int ParseNumber(string code) =>
        code.StartsWith(Prefix, StringComparison.Ordinal) && int.TryParse(code.AsSpan(Prefix.Length), out var n) ? n : 0;
}
