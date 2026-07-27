using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

// MASTER §15 open question №9 fallback (implemented default): no Telegram
// for the Brigadir -> Prorab enters the day's attendance directly via API,
// EnteredManually = true. MASTER §9.4: POST /timesheets, Prorab+.
public sealed record CreateManualTimesheetCommand(
    Guid WorkerId,
    Guid ObjectId,
    DateOnly Date,
    DateTimeOffset CheckInAt,
    DateTimeOffset? CheckOutAt) : IRequest<Result<TimesheetDto>>;

public sealed class CreateManualTimesheetCommandValidator : AbstractValidator<CreateManualTimesheetCommand>
{
    public CreateManualTimesheetCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.Date).NotEmpty();
        RuleFor(x => x.CheckOutAt).GreaterThan(x => x.CheckInAt).When(x => x.CheckOutAt is not null);
    }
}

public sealed class CreateManualTimesheetCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateManualTimesheetCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(CreateManualTimesheetCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure<TimesheetDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<TimesheetDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<TimesheetDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        if (await context.Timesheets.AnyAsync(t => t.WorkerId == request.WorkerId && t.Date == request.Date, cancellationToken))
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_ALREADY_CHECKED_IN", "A timesheet for this worker and date already exists."));

        // MASTER §8.9: same conflict as the check-in path — see that file's comment.
        var hasApprovedAbsence = await context.AbsenceRecords.AnyAsync(
            a => a.WorkerId == request.WorkerId && a.DateFrom <= request.Date && a.DateTo >= request.Date, cancellationToken);
        if (hasApprovedAbsence)
            return Result.Failure<TimesheetDto>(new Error(
                "TIMESHEET_ABSENCE_CONFLICT", "Worker has an approved absence covering this date."));

        var company = await context.Companies.FirstAsync(c => c.Id == worker.CompanyId, cancellationToken);

        var timesheet = Timesheet.Create(worker.CompanyId, worker.Id, request.ObjectId, request.Date, worker.ShiftStartTime, enteredManually: true);
        timesheet.CheckIn(request.CheckInAt, company.LatenessGraceMinutes);
        if (request.CheckOutAt is not null)
            timesheet.CheckOut(request.CheckOutAt.Value);

        context.Timesheets.Add(timesheet);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
