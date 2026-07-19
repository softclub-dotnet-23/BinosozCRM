using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialRequests;

// MASTER §7.3's state diagram includes Approved -> Ordered, but no §9.4
// endpoint names it explicitly (only /approve, /reject, /force-close are
// listed) — same "state machine needs it, endpoint table doesn't name it"
// gap as WorkOrder's Assign/Start/Close. Gated Prorab+ by inference from
// the same actor as approve/reject, not a literal match.
public sealed record MarkMaterialRequestOrderedCommand(Guid MaterialRequestId) : IRequest<Result<MaterialRequestDto>>;

public sealed class MarkMaterialRequestOrderedCommandValidator : AbstractValidator<MarkMaterialRequestOrderedCommand>
{
    public MarkMaterialRequestOrderedCommandValidator()
    {
        RuleFor(x => x.MaterialRequestId).NotEmpty();
    }
}

public sealed class MarkMaterialRequestOrderedCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<MarkMaterialRequestOrderedCommand, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(MarkMaterialRequestOrderedCommand request, CancellationToken cancellationToken)
    {
        var materialRequest = await context.MaterialRequests.FirstOrDefaultAsync(r => r.Id == request.MaterialRequestId, cancellationToken);
        if (materialRequest is null)
            return Result.Failure<MaterialRequestDto>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(materialRequest.ObjectId))
            return Result.Failure<MaterialRequestDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var result = materialRequest.MarkOrdered();
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
