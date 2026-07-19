using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

// MASTER §8.0: only Prorab-approved timesheets (ApprovedAt IS NOT NULL)
// count toward payroll later — approval itself is Phase 5's dependency,
// this step only provides the action.
// Role restriction lives on TimesheetsController's Approve action
// ([Authorize(Roles = "Prorab")], Owner excluded) — see that controller's
// comment for why, corrected in Phase 5 Step 1.
public sealed record ApproveTimesheetCommand(Guid TimesheetId) : IRequest<Result<TimesheetDto>>;

public sealed class ApproveTimesheetCommandValidator : AbstractValidator<ApproveTimesheetCommand>
{
    public ApproveTimesheetCommandValidator()
    {
        RuleFor(x => x.TimesheetId).NotEmpty();
    }
}

public sealed class ApproveTimesheetCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveTimesheetCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(ApproveTimesheetCommand request, CancellationToken cancellationToken)
    {
        var timesheet = await context.Timesheets.FirstOrDefaultAsync(t => t.Id == request.TimesheetId, cancellationToken);
        if (timesheet is null)
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(timesheet.ObjectId))
            return Result.Failure<TimesheetDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        timesheet.Approve(currentUser.UserId!.Value, DateTimeOffset.UtcNow);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
