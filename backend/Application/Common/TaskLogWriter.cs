using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Application.Common;

// MASTER §5.15/§7.1, Rule 3: every status transition writes TaskLog "in the
// same transaction as the transition" — this only adds to the tracked
// DbContext, it never calls SaveChangesAsync itself. The caller's own single
// SaveChangesAsync (already updating the entity's Status) is what makes the
// entity change and the log write atomic; a second, separate SaveChanges call
// here would defeat that.
internal static class TaskLogWriter
{
    public static void Append(
        IApplicationDbContext context,
        Guid companyId,
        TaskLogEntityType entityType,
        Guid entityId,
        string fromStatus,
        string toStatus,
        Guid changedByUserId,
        string? comment = null)
    {
        context.TaskLogs.Add(TaskLog.Create(
            companyId,
            entityType,
            entityId,
            fromStatus,
            toStatus,
            changedByUserId,
            DateTimeOffset.UtcNow,
            comment));
    }
}
