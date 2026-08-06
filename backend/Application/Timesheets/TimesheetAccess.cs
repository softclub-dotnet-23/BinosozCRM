using Application.Common.Interfaces;
using Application.IndividualTasks;
using Application.Objects;
using Domain.Common;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

// Mirrors WorkOrderAccess/BrigadeAccess/ProrabObjectAccess (§11.5 rules 2-3:
// isolation is manual, not an EF global filter) for the two roles that touch
// a specific Timesheet: Brigadir (scoped to their own BrigadeId via the
// Worker the timesheet belongs to) and Prorab+ (scoped by
// ProrabObjectAssignment on the timesheet's ObjectId). Same 404-not-403
// pattern as every other isolation check in this codebase.
internal static class TimesheetAccess
{
    public static async Task<Result<Guid>> GetCallerBrigadeIdOrFailureAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        CancellationToken cancellationToken)
    {
        var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        return brigadeId is null
            ? Result.Failure<Guid>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."))
            : Result.Success(brigadeId.Value);
    }

    public static async Task<Result<Timesheet>> GetForBrigadirAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        Guid timesheetId,
        CancellationToken cancellationToken)
    {
        var brigadeResult = await GetCallerBrigadeIdOrFailureAsync(context, currentUser, cancellationToken);
        if (brigadeResult.IsFailure)
            return Result.Failure<Timesheet>(brigadeResult.Error);

        var timesheet = await context.Timesheets.FirstOrDefaultAsync(t => t.Id == timesheetId, cancellationToken);
        if (timesheet is null)
            return Result.Failure<Timesheet>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));

        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == timesheet.WorkerId, cancellationToken);
        if (worker is null || worker.BrigadeId != brigadeResult.Value)
            return Result.Failure<Timesheet>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));

        return Result.Success(timesheet);
    }

    public static async Task<Result<Timesheet>> GetForProrabAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        Guid timesheetId,
        CancellationToken cancellationToken)
    {
        var timesheet = await context.Timesheets.FirstOrDefaultAsync(t => t.Id == timesheetId, cancellationToken);
        if (timesheet is null)
            return Result.Failure<Timesheet>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(timesheet.ObjectId))
            return Result.Failure<Timesheet>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(timesheet);
    }
}
