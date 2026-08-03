using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.IssueReports;

// Mirrors MaterialRequestAccess (§11.5 rules 2-3: isolation is manual, not
// an EF global filter) — Prorab+ scoped by ProrabObjectAssignment on the
// report's own ObjectId.
internal static class IssueReportAccess
{
    public static async Task<Result<IssueReport>> GetForProrabAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        Guid issueReportId,
        CancellationToken cancellationToken)
    {
        var report = await context.IssueReports.FirstOrDefaultAsync(r => r.Id == issueReportId, cancellationToken);
        if (report is null)
            return Result.Failure<IssueReport>(new Error("ISSUE_REPORT_NOT_FOUND", "Issue report not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(report.ObjectId))
            return Result.Failure<IssueReport>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(report);
    }
}
