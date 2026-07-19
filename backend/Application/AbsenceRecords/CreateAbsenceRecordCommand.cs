using Application.Common.Interfaces;
using Application.WorkOrders;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.AbsenceRecords;

// MASTER §8.9: "Создаёт прораб или бухгалтер (не бригадир — нужен
// документ/решение)." Creation IS the decision — no separate approval
// step exists in §9.4 (only GET,POST /absences), so Approve() is called
// immediately, by the creator, inside this handler.
public sealed record CreateAbsenceRecordCommand(
    Guid WorkerId,
    DateOnly DateFrom,
    DateOnly DateTo,
    AbsenceType Type,
    bool IsPaid,
    string? Reason,
    PhotoUpload? Document) : IRequest<Result<AbsenceRecordDto>>;

public sealed class CreateAbsenceRecordCommandValidator : AbstractValidator<CreateAbsenceRecordCommand>
{
    public CreateAbsenceRecordCommandValidator()
    {
        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.DateTo).GreaterThanOrEqualTo(x => x.DateFrom);
        RuleFor(x => x.Reason).MaximumLength(1000);
    }
}

public sealed class CreateAbsenceRecordCommandHandler(
    IApplicationDbContext context, ICurrentUserService currentUser, IPhotoStorageService photoStorage)
    : IRequestHandler<CreateAbsenceRecordCommand, Result<AbsenceRecordDto>>
{
    public async Task<Result<AbsenceRecordDto>> Handle(CreateAbsenceRecordCommand request, CancellationToken cancellationToken)
    {
        var worker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.WorkerId, cancellationToken);
        if (worker is null)
            return Result.Failure<AbsenceRecordDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        // MASTER §8.9: "Пересечение с Timesheet ... конфликт, 400 ... не
        // угадывать" — whichever record (Timesheet or AbsenceRecord) is
        // created second is the one that's rejected, regardless of order;
        // see CheckInTimesheetCommand/CreateManualTimesheetCommand for the
        // reverse-direction check.
        var hasConflictingTimesheet = await context.Timesheets.AnyAsync(
            t => t.WorkerId == request.WorkerId && t.Date >= request.DateFrom && t.Date <= request.DateTo, cancellationToken);
        if (hasConflictingTimesheet)
            return Result.Failure<AbsenceRecordDto>(new Error(
                "TIMESHEET_ABSENCE_CONFLICT", "Worker already has an attendance record in this date range."));

        string? documentStorageKey = null;
        if (request.Document is not null)
        {
            if (!photoStorage.IsAllowedContentType(request.Document.ContentType))
                return Result.Failure<AbsenceRecordDto>(new Error(
                    "PHOTO_INVALID_TYPE", $"Content type '{request.Document.ContentType}' is not allowed."));

            if (request.Document.Length > photoStorage.MaxFileSizeBytes)
                return Result.Failure<AbsenceRecordDto>(new Error(
                    "PHOTO_TOO_LARGE", $"Document exceeds the maximum allowed size of {photoStorage.MaxFileSizeBytes} bytes."));

            documentStorageKey = await photoStorage.SaveAsync(request.Document.Content, request.Document.ContentType, cancellationToken);
        }

        var record = AbsenceRecord.Create(
            worker.CompanyId, worker.Id, request.DateFrom, request.DateTo, request.Type, request.IsPaid,
            request.Reason, documentStorageKey);
        record.Approve(currentUser.UserId!.Value);

        context.AbsenceRecords.Add(record);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(AbsenceRecordDto.FromEntity(record, photoStorage));
    }
}
