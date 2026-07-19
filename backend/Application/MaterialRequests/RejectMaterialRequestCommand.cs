using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialRequests;

// Domain's Reject() allows it from any status except Delivered/Rejected —
// wider than just "Requested"; no reason/comment param exists on the
// entity (unlike WorkOrder's Reject, which writes TaskLog.Comment).
public sealed record RejectMaterialRequestCommand(Guid MaterialRequestId) : IRequest<Result<MaterialRequestDto>>;

public sealed class RejectMaterialRequestCommandValidator : AbstractValidator<RejectMaterialRequestCommand>
{
    public RejectMaterialRequestCommandValidator()
    {
        RuleFor(x => x.MaterialRequestId).NotEmpty();
    }
}

public sealed class RejectMaterialRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<RejectMaterialRequestCommand, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(RejectMaterialRequestCommand request, CancellationToken cancellationToken)
    {
        var materialRequest = await context.MaterialRequests.FirstOrDefaultAsync(r => r.Id == request.MaterialRequestId, cancellationToken);
        if (materialRequest is null)
            return Result.Failure<MaterialRequestDto>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(materialRequest.ObjectId))
            return Result.Failure<MaterialRequestDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var result = materialRequest.Reject();
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
