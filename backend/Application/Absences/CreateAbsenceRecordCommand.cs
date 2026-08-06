using Application.Common.Interfaces;
using Application.Common.Options;
using Application.WorkOrders;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Application.Absences;

// MASTER §9.4/§8.9: POST /absences — Prorab+, Accountant. "Создаёт прораб
// или бухгалтер (не бригадир — нужен документ/решение)" — no Brigadir path
// at all, unlike every other Brigadir-heavy handler in this codebase.
// §9.4 lists no separate /absences/{id}/approve endpoint (only GET,POST) —
// read that as the creator's decision *is* the approval, since only
// Prorab+/Accountant can create one in the first place; Approve() is called
// right here rather than leaving ApprovedByUserId permanently null.
//
// Optional Document reuses the exact IFileStorageService/signed-URL
// mechanism WorkOrderProgress already established (§11.9) rather than
// accepting a caller-supplied URL string — no size/MIME validation, no
// signing, would have been a real gap against that section. Limitation,
// flagged not fixed: the shared FileStorageOptions allow-list is still
// image-only; a real medical certificate might be a PDF. Widening it is a
// deliberate call, not made here.
public sealed record CreateAbsenceRecordCommand(
    Guid WorkerId,
    DateOnly DateFrom,
    DateOnly DateTo,
    AbsenceType Type,
    bool IsPaid,
    string? Reason,
    WorkOrderProgressPhoto? Document) : IRequest<Result<AbsenceRecordDto>>;

public sealed class CreateAbsenceRecordCommandValidator : AbstractValidator<CreateAbsenceRecordCommand>
{
    public CreateAbsenceRecordCommandValidator(IOptions<FileStorageOptions> fileStorageOptions)
    {
        var options = fileStorageOptions.Value;

        RuleFor(x => x.WorkerId).NotEmpty();
        RuleFor(x => x.DateTo).GreaterThanOrEqualTo(x => x.DateFrom);
        RuleFor(x => x.Reason).MaximumLength(500);

        RuleFor(x => x.Document!.Length)
            .InclusiveBetween(1, options.MaxFileSizeBytes)
            .WithMessage($"Document must be between 1 and {options.MaxFileSizeBytes} bytes.")
            .When(x => x.Document is not null);

        RuleFor(x => x.Document!.ContentType)
            .Must(contentType => options.AllowedContentTypes.Contains(contentType))
            .WithMessage("Document content type is not allowed.")
            .When(x => x.Document is not null);
    }
}

public sealed class CreateAbsenceRecordCommandHandler(
    IApplicationDbContext context, ICurrentUserService currentUser, IFileStorageService fileStorage)
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

        string? documentKey = request.Document is null
            ? null
            : await fileStorage.SaveAsync(request.Document.Content, request.Document.ContentType, cancellationToken);

        var record = AbsenceRecord.Create(
            currentUser.CompanyId!.Value,
            request.WorkerId,
            request.DateFrom,
            request.DateTo,
            request.Type,
            request.IsPaid,
            request.Reason,
            documentKey);

        record.Approve(currentUser.UserId!.Value);

        context.AbsenceRecords.Add(record);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(AbsenceRecordDto.FromEntity(record, fileStorage));
    }
}
