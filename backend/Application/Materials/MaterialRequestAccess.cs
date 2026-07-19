using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// Mirrors WorkOrderAccess/TimesheetAccess (§11.5 rules 2-3: isolation is
// manual, not an EF global filter) — Prorab+ scoped by
// ProrabObjectAssignment on the request's own ObjectId.
internal static class MaterialRequestAccess
{
    public static async Task<Result<MaterialRequest>> GetForProrabAsync(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        Guid materialRequestId,
        CancellationToken cancellationToken)
    {
        var request = await context.MaterialRequests.FirstOrDefaultAsync(r => r.Id == materialRequestId, cancellationToken);
        if (request is null)
            return Result.Failure<MaterialRequest>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<MaterialRequest>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(request);
    }
}
