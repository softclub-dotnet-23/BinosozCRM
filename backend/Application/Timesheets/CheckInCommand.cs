using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

// MASTER §9.4/§8.4: POST /timesheets/check-in — Brigadir, for themselves or
// any worker in their own brigade ("за всю бригаду и за себя"). §8.1:
// LateMinutes is computed once, right here, and never recalculated —
// PlannedStartTime is a snapshot of Worker.ShiftStartTime taken at Timesheet
// creation, so a rate/schedule change tomorrow can't rewrite today's
// lateness. Live check-in always uses "now"; a backdated correction is
// CreateTimesheetCommand's job (EnteredManually = true), not this endpoint's.
public sealed record CheckInCommand(Guid WorkerId, Guid ObjectId) : IRequest<Result<TimesheetDto>>;

public sealed class CheckInCommandValidator : AbstractValidator<CheckInCommand>
{
    public CheckInCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.ObjectId).NotEmpty();
    }
}

public sealed class CheckInCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CheckInCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(CheckInCommand request, CancellationToken cancellationToken)
    {
        var brigadeResult = await TimesheetAccess.GetCallerBrigadeIdOrFailureAsync(context, currentUser, cancellationToken);
        if (brigadeResult.IsFailure)
            return Result.Failure<TimesheetDto>(brigadeResult.Error);

        // §4's "не видит чужие бригады" applied to *whom* the Brigadir can
        // act on behalf of, not just what they can read — a WorkerId outside
        // their own brigade genuinely exists elsewhere in the roster, but
        // reads as not-found here, same as every other cross-brigade lookup.
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null || worker.BrigadeId != brigadeResult.Value)
            return Result.Failure<TimesheetDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<TimesheetDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var checkInAt = DateTimeOffset.UtcNow;
        var date = DateOnly.FromDateTime(checkInAt.UtcDateTime);

        var timesheet = await context.Timesheets
            .FirstOrDefaultAsync(t => t.WorkerId == request.WorkerId && t.Date == date, cancellationToken);

        if (timesheet is not null && timesheet.CheckInAt is not null)
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_ALREADY_CHECKED_IN", "Already checked in today."));

        var company = await context.Companies.FirstAsync(cancellationToken);

        if (timesheet is null)
        {
            timesheet = Timesheet.Create(worker.CompanyId, worker.Id, request.ObjectId, date, worker.ShiftStartTime);
            context.Timesheets.Add(timesheet);
        }

        timesheet.CheckIn(checkInAt, company.LatenessGraceMinutes);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
