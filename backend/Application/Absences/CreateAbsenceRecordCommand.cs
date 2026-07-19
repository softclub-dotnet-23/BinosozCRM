using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Absences;

// MASTER §9.4/§8.9: POST /absences — Prorab+, Accountant. "Создаёт прораб
// или бухгалтер (не бригадир — нужен документ/решение)" — no Brigadir path
// at all, unlike every other Brigadir-heavy handler in this codebase.
// §9.4 lists no separate /absences/{id}/approve endpoint (only GET,POST) —
// read that as the creator's decision *is* the approval, since only
// Prorab+/Accountant can create one in the first place; Approve() is called
// right here rather than leaving ApprovedByUserId permanently null.
public sealed record CreateAbsenceRecordCommand(
    Guid WorkerId,
    DateOnly DateFrom,
    DateOnly DateTo,
    AbsenceType Type,
    bool IsPaid,
    string? Reason,
    string? DocumentUrl) : IRequest<Result<AbsenceRecordDto>>;

public sealed class CreateAbsenceRecordCommandValidator : AbstractValidator<CreateAbsenceRecordCommand>
{
    public CreateAbsenceRecordCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.DateTo).GreaterThanOrEqualTo(x => x.DateFrom);
        RuleFor(x => x.Reason).MaximumLength(500);
        RuleFor(x => x.DocumentUrl).MaximumLength(1000);
    }
}

public sealed class CreateAbsenceRecordCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateAbsenceRecordCommand, Result<AbsenceRecordDto>>
{
    public async Task<Result<AbsenceRecordDto>> Handle(CreateAbsenceRecordCommand request, CancellationToken cancellationToken)
    {
        if (!await context.Workers.AnyAsync(w => w.Id == request.WorkerId, cancellationToken))
            return Result.Failure<AbsenceRecordDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        // §8.9: "Пересечение с Timesheet (человек отмечен И в отпуске) —
        // конфликт, 400: либо отметка ошибочна, либо отсутствие. Не
        // угадывать." — a day already marked with a real check-in blocks
        // the absence from being filed over it, same as the reverse guard
        // in CheckInCommandHandler blocks a check-in during a filed absence.
        var hasConflictingTimesheet = await context.Timesheets.AnyAsync(
            t => t.WorkerId == request.WorkerId
                 && t.Date >= request.DateFrom
                 && t.Date <= request.DateTo
                 && t.CheckInAt != null,
            cancellationToken);
        if (hasConflictingTimesheet)
            return Result.Failure<AbsenceRecordDto>(new Error("TIMESHEET_ABSENCE_CONFLICT", "Worker already has a check-in recorded during this date range."));

        var record = AbsenceRecord.Create(
            currentUser.CompanyId!.Value,
            request.WorkerId,
            request.DateFrom,
            request.DateTo,
            request.Type,
            request.IsPaid,
            request.Reason,
            request.DocumentUrl);

        record.Approve(currentUser.UserId!.Value);

        context.AbsenceRecords.Add(record);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(AbsenceRecordDto.FromEntity(record));
    }
}
