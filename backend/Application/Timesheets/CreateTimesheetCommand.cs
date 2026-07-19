using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Timesheets;

// MASTER §9.4/§8.4: POST /timesheets — the backdated-correction path,
// distinct from POST /timesheets/check-in's live flow. §8.4: "Отметка
// задним числом разрешена, но EnteredManually = true — прораб при приёмке
// видит, где время реальное, где восстановленное." Always EnteredManually,
// since anything going through this endpoint is by definition not a live
// tap — Brigadir only (same "за всю бригаду и за себя" scope as check-in;
// §9.4 doesn't call out a separate Prorab+ write path for Timesheet, only
// GET+approve).
public sealed record CreateTimesheetCommand(
    Guid WorkerId,
    Guid ObjectId,
    DateOnly Date,
    DateTimeOffset? CheckInAt,
    DateTimeOffset? CheckOutAt) : IRequest<Result<TimesheetDto>>;

public sealed class CreateTimesheetCommandValidator : AbstractValidator<CreateTimesheetCommand>
{
    public CreateTimesheetCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.CheckOutAt)
            .GreaterThanOrEqualTo(x => x.CheckInAt!.Value)
            .When(x => x.CheckInAt is not null && x.CheckOutAt is not null);
    }
}

public sealed class CreateTimesheetCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateTimesheetCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(CreateTimesheetCommand request, CancellationToken cancellationToken)
    {
        var brigadeResult = await TimesheetAccess.GetCallerBrigadeIdOrFailureAsync(context, currentUser, cancellationToken);
        if (brigadeResult.IsFailure)
            return Result.Failure<TimesheetDto>(brigadeResult.Error);

        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null || worker.BrigadeId != brigadeResult.Value)
            return Result.Failure<TimesheetDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<TimesheetDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        if (await context.Timesheets.AnyAsync(t => t.WorkerId == request.WorkerId && t.Date == request.Date, cancellationToken))
            return Result.Failure<TimesheetDto>(new Error("TIMESHEET_ALREADY_CHECKED_IN", "A timesheet already exists for this worker on this date."));

        var company = await context.Companies.FirstAsync(cancellationToken);

        var timesheet = Timesheet.Create(worker.CompanyId, worker.Id, request.ObjectId, request.Date, worker.ShiftStartTime, enteredManually: true);

        if (request.CheckInAt is not null)
            timesheet.CheckIn(request.CheckInAt.Value, company.LatenessGraceMinutes);

        if (request.CheckOutAt is not null)
            timesheet.CheckOut(request.CheckOutAt.Value);

        context.Timesheets.Add(timesheet);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
