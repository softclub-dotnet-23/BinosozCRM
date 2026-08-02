using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Timesheets;

// MASTER §9.4/§8.4: POST /timesheets/{id}/check-out — Brigadir, own brigade.
// Worker (post-MASTER addition): own timesheet only.
// HoursWorked = CheckOutAt - CheckInAt (Timesheet.CheckOut already tolerates
// a missing CheckInAt by leaving HoursWorked null — no separate error code
// for "checked out without checking in" exists in §9.2's catalogue, and
// this isn't a state machine with defined transitions to guard, so nothing
// invented here).
public sealed record CheckOutCommand(Guid TimesheetId) : IRequest<Result<TimesheetDto>>;

public sealed class CheckOutCommandValidator : AbstractValidator<CheckOutCommand>
{
    public CheckOutCommandValidator()
    {
        RuleFor(x => x.TimesheetId).NotEmpty();
    }
}

public sealed class CheckOutCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IBusinessTimeProvider businessTime)
    : IRequestHandler<CheckOutCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(CheckOutCommand request, CancellationToken cancellationToken)
    {
        var accessResult = currentUser.Role == Role.Worker
            ? await TimesheetAccess.GetForWorkerAsync(context, currentUser, request.TimesheetId, cancellationToken)
            : await TimesheetAccess.GetForBrigadirAsync(context, currentUser, request.TimesheetId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<TimesheetDto>(accessResult.Error);

        var timesheet = accessResult.Value;
        // This remains an UTC instant. The Timesheet.Date is fixed at
        // check-in's business date, so an overnight checkout never creates a
        // second attendance day merely because UTC/local midnight passed.
        timesheet.CheckOut(businessTime.UtcNow);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
