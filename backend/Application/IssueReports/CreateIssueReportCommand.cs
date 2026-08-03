using Application.Common.Interfaces;
using Application.Common.Options;
using Application.IndividualTasks;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Application.IssueReports;

// New (Worker-dashboard checkpoint, docs/PROGRESS.md): "Сообщить о
// проблеме" — Brigadir/Worker, own object. Same shape as
// CreateMaterialRequestCommand (ObjectId supplied by the caller, validated
// to exist — not auto-resolved, matching that existing convention) plus an
// optional single photo, reusing AddWorkOrderProgressCommand's buffered-read
// validation (size/content-type limits from FileStorageOptions) for one file
// instead of a list.
public sealed record CreateIssueReportCommand(
    Guid ObjectId,
    string Title,
    string Description,
    Guid? IndividualTaskId,
    IssueReportPhoto? Photo) : IRequest<Result<IssueReportDto>>;

public sealed record IssueReportPhoto(Stream Content, string ContentType, long Length);

public sealed class CreateIssueReportCommandValidator : AbstractValidator<CreateIssueReportCommand>
{
    public CreateIssueReportCommandValidator(IOptions<FileStorageOptions> fileStorageOptions)
    {
        var options = fileStorageOptions.Value;

        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);

        RuleFor(x => x.Photo).ChildRules(photo =>
        {
            photo.RuleFor(p => p!.Length)
                .InclusiveBetween(1, options.MaxFileSizeBytes)
                .WithMessage($"Photo must be between 1 and {options.MaxFileSizeBytes} bytes.");

            photo.RuleFor(p => p!.ContentType)
                .Must(contentType => options.AllowedContentTypes.Contains(contentType))
                .WithMessage("Photo content type is not allowed.");
        }).When(x => x.Photo is not null);
    }
}

public sealed class CreateIssueReportCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IFileStorageService fileStorage,
    IOptions<FileStorageOptions> fileStorageOptions)
    : IRequestHandler<CreateIssueReportCommand, Result<IssueReportDto>>
{
    public async Task<Result<IssueReportDto>> Handle(CreateIssueReportCommand request, CancellationToken cancellationToken)
    {
        var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (brigadeId is null)
            return Result.Failure<IssueReportDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<IssueReportDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        if (request.IndividualTaskId is not null)
        {
            var taskBelongsToBrigade = await context.IndividualTasks
                .AnyAsync(t => t.Id == request.IndividualTaskId.Value && t.BrigadeId == brigadeId.Value, cancellationToken);
            if (!taskBelongsToBrigade)
                return Result.Failure<IssueReportDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));
        }

        string? photoKey = null;
        if (request.Photo is not null)
        {
            var options = fileStorageOptions.Value;
            var bufferedResult = await ReadPhotoAsync(request.Photo.Content, options.MaxFileSizeBytes, cancellationToken);
            if (bufferedResult.IsFailure)
                return Result.Failure<IssueReportDto>(bufferedResult.Error);

            await using var bufferedStream = new MemoryStream(bufferedResult.Value, writable: false);
            photoKey = await fileStorage.SaveAsync(bufferedStream, request.Photo.ContentType, cancellationToken);
        }

        var report = IssueReport.Create(
            currentUser.CompanyId!.Value,
            request.ObjectId,
            currentUser.UserId!.Value,
            request.Title,
            request.Description,
            DateTimeOffset.UtcNow,
            request.IndividualTaskId,
            photoKey);

        context.IssueReports.Add(report);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IssueReportDto.FromEntity(report, fileStorage));
    }

    private static async Task<Result<byte[]>> ReadPhotoAsync(Stream content, long maxFileSizeBytes, CancellationToken cancellationToken)
    {
        await using var buffered = new MemoryStream();
        var buffer = new byte[81920];
        long bytesRead = 0;

        while (true)
        {
            var read = await content.ReadAsync(buffer.AsMemory(), cancellationToken);
            if (read == 0)
                break;

            bytesRead += read;
            if (bytesRead > maxFileSizeBytes)
                return Result.Failure<byte[]>(new Error("VALIDATION_FAILED", "The uploaded photo exceeds the allowed file size."));

            await buffered.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }

        return Result.Success(buffered.ToArray());
    }
}
