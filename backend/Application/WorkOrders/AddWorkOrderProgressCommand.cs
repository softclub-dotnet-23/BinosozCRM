using Application.Common.Interfaces;
using Application.Common.Options;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Application.WorkOrders;

// MASTER §9.4/§5.12: POST /work-orders/{id}/progress — Brigadir, own
// brigade. §7.1: "ReportedQty принимается только при InProgress" — not a
// state transition itself (WorkOrder.Status doesn't change), so no
// TaskLogWriter call here, unlike every handler in WorkOrderAccess's other
// callers.
public sealed record AddWorkOrderProgressCommand(
    Guid WorkOrderId,
    decimal ReportedQty,
    string? Comment,
    IReadOnlyList<WorkOrderProgressPhoto> Photos) : IRequest<Result<WorkOrderProgressDto>>;

public sealed class AddWorkOrderProgressCommandValidator : AbstractValidator<AddWorkOrderProgressCommand>
{
    public AddWorkOrderProgressCommandValidator(IOptions<FileStorageOptions> fileStorageOptions)
    {
        var options = fileStorageOptions.Value;

        RuleFor(x => x.WorkOrderId).NotEmpty();
        RuleFor(x => x.ReportedQty).GreaterThan(0m);
        RuleFor(x => x.Comment).MaximumLength(2000);
        RuleFor(x => x.Photos)
            .Must(photos => photos.Count <= options.MaxPhotosPerProgress)
            .WithMessage($"No more than {options.MaxPhotosPerProgress} photos can be uploaded at once.");

        // §11.9: size limit + allow-list MIME (not blacklist), enforced here
        // as the same VALIDATION_FAILED path as every other bad request —
        // no dedicated error code for "photo rejected" in §9.2's catalog.
        RuleForEach(x => x.Photos).ChildRules(photo =>
        {
            photo.RuleFor(p => p.Length)
                .InclusiveBetween(1, options.MaxFileSizeBytes)
                .WithMessage($"Photo must be between 1 and {options.MaxFileSizeBytes} bytes.");

            photo.RuleFor(p => p.ContentType)
                .Must(contentType => options.AllowedContentTypes.Contains(contentType))
                .WithMessage("Photo content type is not allowed.");
        });
    }
}

public sealed class AddWorkOrderProgressCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IFileStorageService fileStorage,
    IOptions<FileStorageOptions> fileStorageOptions)
    : IRequestHandler<AddWorkOrderProgressCommand, Result<WorkOrderProgressDto>>
{
    public async Task<Result<WorkOrderProgressDto>> Handle(AddWorkOrderProgressCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await WorkOrderAccess.GetForBrigadirAsync(context, currentUser, request.WorkOrderId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<WorkOrderProgressDto>(accessResult.Error);

        var order = accessResult.Value;
        if (order.Status != WorkOrderStatus.InProgress)
            return Result.Failure<WorkOrderProgressDto>(
                new Error("WORK_ORDER_INVALID_TRANSITION", "Progress can only be reported while the work order is in progress."));

        var options = fileStorageOptions.Value;
        if (request.Photos.Count > options.MaxPhotosPerProgress)
            return Result.Failure<WorkOrderProgressDto>(new Error("VALIDATION_FAILED", $"No more than {options.MaxPhotosPerProgress} photos can be uploaded at once."));

        // IFormFile.Length is metadata supplied by the multipart parser. Buffer
        // every stream with hard byte caps before persisting any photo, so a
        // dishonest/truncated stream cannot bypass the limit and no rejected
        // request leaves partially stored files behind.
        var bufferedPhotos = new List<(byte[] Content, string ContentType)>(request.Photos.Count);
        long totalBytes = 0;
        foreach (var photo in request.Photos)
        {
            var bufferedResult = await ReadPhotoAsync(photo.Content, options.MaxFileSizeBytes, options.MaxTotalUploadSizeBytes - totalBytes, cancellationToken);
            if (bufferedResult.IsFailure)
                return Result.Failure<WorkOrderProgressDto>(bufferedResult.Error);

            totalBytes += bufferedResult.Value.LongLength;
            bufferedPhotos.Add((bufferedResult.Value, photo.ContentType));
        }

        var photoKeys = new List<string>(bufferedPhotos.Count);
        foreach (var photo in bufferedPhotos)
        {
            await using var content = new MemoryStream(photo.Content, writable: false);
            photoKeys.Add(await fileStorage.SaveAsync(content, photo.ContentType, cancellationToken));
        }

        var progress = WorkOrderProgress.Create(
            order.CompanyId,
            order.Id,
            currentUser.UserId!.Value,
            request.ReportedQty,
            DateTimeOffset.UtcNow,
            photoKeys,
            request.Comment);

        context.WorkOrderProgresses.Add(progress);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(WorkOrderProgressDto.FromEntity(progress, fileStorage));
    }

    private static async Task<Result<byte[]>> ReadPhotoAsync(
        Stream content,
        long maxFileSizeBytes,
        long remainingTotalBytes,
        CancellationToken cancellationToken)
    {
        if (remainingTotalBytes <= 0)
            return Result.Failure<byte[]>(new Error("VALIDATION_FAILED", "Total upload size exceeds the allowed limit."));

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
                return Result.Failure<byte[]>(new Error("VALIDATION_FAILED", "An uploaded photo exceeds the allowed file size."));

            if (bytesRead > remainingTotalBytes)
                return Result.Failure<byte[]>(new Error("VALIDATION_FAILED", "Total upload size exceeds the allowed limit."));

            await buffered.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }

        return Result.Success(buffered.ToArray());
    }
}
