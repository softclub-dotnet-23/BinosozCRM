using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.WorkOrders;

// MASTER §5.12, §7.1 ("ReportedQty принимается только при InProgress"),
// §9.4 (POST /work-orders/{id}/progress, Brigadir), §11.9 (photo storage
// rules — enforced here via IPhotoStorageService, not re-implemented).
public sealed record SubmitWorkOrderProgressCommand(
    Guid WorkOrderId,
    decimal ReportedQty,
    string? Comment,
    IReadOnlyList<PhotoUpload> Photos) : IRequest<Result<WorkOrderProgressDto>>;

public sealed class SubmitWorkOrderProgressCommandValidator : AbstractValidator<SubmitWorkOrderProgressCommand>
{
    public SubmitWorkOrderProgressCommandValidator()
    {
        RuleFor(x => x.WorkOrderId).NotEmpty();
        RuleFor(x => x.ReportedQty).GreaterThan(0);
        RuleFor(x => x.Comment).MaximumLength(2000);
    }
}

public sealed class SubmitWorkOrderProgressCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IPhotoStorageService photoStorage)
    : IRequestHandler<SubmitWorkOrderProgressCommand, Result<WorkOrderProgressDto>>
{
    public async Task<Result<WorkOrderProgressDto>> Handle(SubmitWorkOrderProgressCommand request, CancellationToken cancellationToken)
    {
        var workOrder = await context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.WorkOrderId, cancellationToken);
        if (workOrder is null)
            return Result.Failure<WorkOrderProgressDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != workOrder.BrigadeId)
            return Result.Failure<WorkOrderProgressDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        if (workOrder.Status != WorkOrderStatus.InProgress)
            return Result.Failure<WorkOrderProgressDto>(new Error(
                "WORK_ORDER_NOT_IN_PROGRESS", "Progress can only be reported while the work order is in progress."));

        foreach (var photo in request.Photos)
        {
            if (!photoStorage.IsAllowedContentType(photo.ContentType))
                return Result.Failure<WorkOrderProgressDto>(new Error(
                    "PHOTO_INVALID_TYPE", $"Content type '{photo.ContentType}' is not allowed."));

            if (photo.Length > photoStorage.MaxFileSizeBytes)
                return Result.Failure<WorkOrderProgressDto>(new Error(
                    "PHOTO_TOO_LARGE", $"Photo exceeds the maximum allowed size of {photoStorage.MaxFileSizeBytes} bytes."));
        }

        var storageKeys = new List<string>(request.Photos.Count);
        foreach (var photo in request.Photos)
            storageKeys.Add(await photoStorage.SaveAsync(photo.Content, photo.ContentType, cancellationToken));

        var progress = WorkOrderProgress.Create(
            workOrder.CompanyId,
            workOrder.Id,
            currentUser.UserId!.Value,
            request.ReportedQty,
            DateTimeOffset.UtcNow,
            storageKeys,
            request.Comment);

        context.WorkOrderProgresses.Add(progress);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(WorkOrderProgressDto.FromEntity(progress, photoStorage));
    }
}
