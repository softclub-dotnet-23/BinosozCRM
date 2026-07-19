using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

public sealed record CheckOutTimesheetCommand(Guid TimesheetId) : IRequest<Result<TimesheetDto>>;

public sealed class CheckOutTimesheetCommandValidator : AbstractValidator<CheckOutTimesheetCommand>
{
    public CheckOutTimesheetCommandValidator()
    {
        RuleFor(x => x.TimesheetId).NotEmpty();
    }
}

public sealed class CheckOutTimesheetCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CheckOutTimesheetCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(CheckOutTimesheetCommand request, CancellationToken cancellationToken)
    {
        var timesheet = await context.Timesheets.FirstOrDefaultAsync(t => t.Id == request.TimesheetId, cancellationToken);
        if (timesheet is null)
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));

        var worker = await context.Workers.FirstAsync(w => w.Id == timesheet.WorkerId, cancellationToken);
        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != worker.BrigadeId)
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_NOT_FOUND", "Timesheet not found."));

        timesheet.CheckOut(DateTimeOffset.UtcNow);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
