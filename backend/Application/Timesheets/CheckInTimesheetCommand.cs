using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

// MASTER §9.4 (POST /timesheets/check-in, Brigadir), §8.1 ("бригадир
// отмечает... за всю бригаду и за себя"). One worker per call — a bulk
// "whole brigade at once" convenience isn't named as its own endpoint, so
// not built as one; a bot flow can call this once per worker.
public sealed record CheckInTimesheetCommand(Guid WorkerId, Guid ObjectId) : IRequest<Result<TimesheetDto>>;

public sealed class CheckInTimesheetCommandValidator : AbstractValidator<CheckInTimesheetCommand>
{
    public CheckInTimesheetCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.ObjectId).NotEmpty();
    }
}

public sealed class CheckInTimesheetCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CheckInTimesheetCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(CheckInTimesheetCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure<TimesheetDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        // MASTER §11.5 rule 2: brigade isolation is manual. A worker outside
        // the caller's own brigade reads as not-found, not forbidden.
        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != worker.BrigadeId)
            return Result.Failure<TimesheetDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<TimesheetDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Uniqueness is (WorkerId, Date) — "already checked in today" IS "a
        // Timesheet row for today already exists", not a separate flag.
        if (await context.Timesheets.AnyAsync(t => t.WorkerId == request.WorkerId && t.Date == today, cancellationToken))
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_ALREADY_CHECKED_IN", "Worker already checked in today."));

        // MASTER §8.9: the same "attendance vs. absence, don't guess" 400
        // applies in this direction too — checking in during a date an
        // AbsenceRecord already covers is exactly the conflict it names.
        var hasApprovedAbsence = await context.AbsenceRecords.AnyAsync(
            a => a.WorkerId == request.WorkerId && a.DateFrom <= today && a.DateTo >= today, cancellationToken);
        if (hasApprovedAbsence)
            return Result.Failure<TimesheetDto>(new Error(
                "TIMESHEET_ABSENCE_CONFLICT", "Worker has an approved absence covering today."));

        var company = await context.Companies.FirstAsync(c => c.Id == worker.CompanyId, cancellationToken);

        var timesheet = Timesheet.Create(worker.CompanyId, worker.Id, request.ObjectId, today, worker.ShiftStartTime);
        timesheet.CheckIn(DateTimeOffset.UtcNow, company.LatenessGraceMinutes);

        context.Timesheets.Add(timesheet);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
