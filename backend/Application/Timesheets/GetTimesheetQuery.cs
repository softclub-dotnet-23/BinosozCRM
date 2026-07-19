using Application.Common;
using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

public sealed record GetTimesheetQuery(Guid Id) : IRequest<Result<TimesheetDto>>;

public sealed class GetTimesheetQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetTimesheetQuery, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(GetTimesheetQuery request, CancellationToken cancellationToken)
    {
        var timesheet = await context.Timesheets.FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);
        if (timesheet is null)
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));

        if (currentUser.Role == Role.Brigadir)
        {
            var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
            var worker = await context.Workers.FirstAsync(w => w.Id == timesheet.WorkerId, cancellationToken);
            if (ownBrigadeId != worker.BrigadeId)
                return Result.Failure<TimesheetDto>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));
        }
        else
        {
            var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
            if (allowedObjectIds is not null && !allowedObjectIds.Contains(timesheet.ObjectId))
                return Result.Failure<TimesheetDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));
        }

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
