using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.Timesheets;

// MASTER §9.4/§8.4: POST /timesheets/{id}/check-out — Brigadir, own brigade.
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

public sealed class CheckOutCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CheckOutCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(CheckOutCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await TimesheetAccess.GetForBrigadirAsync(context, currentUser, request.TimesheetId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<TimesheetDto>(accessResult.Error);

        var timesheet = accessResult.Value;
        timesheet.CheckOut(DateTimeOffset.UtcNow);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
