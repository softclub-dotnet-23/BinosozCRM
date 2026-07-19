using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialRequests;

// MASTER §9.4: "POST /material-requests/{id}/force-close Prorab+ ←
// недопоставка, комментарий обязателен." §7.3: "Прораб может вручную
// закрыть в Delivered при недопоставке ... с обязательным комментарием."
//
// GAP, flagged not silently worked around: MaterialRequest (§5.17) has no
// Comment/Reason field at all, and Domain's ForceDeliver() takes no
// comment parameter — there is nowhere on this entity to persist the
// "обязательный комментарий" MASTER requires. Comment is still required
// here (FluentValidation) so the API contract matches MASTER's stated
// rule, but it is currently validated and then discarded, not stored.
// нужно от Ахмада: MaterialRequest needs a Comment (or similar) field to
// actually hold this justification — Domain/Persistence-Configurations is
// exclusively his to touch.
public sealed record ForceCloseMaterialRequestCommand(Guid MaterialRequestId, string Comment) : IRequest<Result<MaterialRequestDto>>;

public sealed class ForceCloseMaterialRequestCommandValidator : AbstractValidator<ForceCloseMaterialRequestCommand>
{
    public ForceCloseMaterialRequestCommandValidator()
    {
        RuleFor(x => x.MaterialRequestId).NotEmpty();
        RuleFor(x => x.Comment).NotEmpty().MaximumLength(1000);
    }
}

public sealed class ForceCloseMaterialRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ForceCloseMaterialRequestCommand, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(ForceCloseMaterialRequestCommand request, CancellationToken cancellationToken)
    {
        var materialRequest = await context.MaterialRequests.FirstOrDefaultAsync(r => r.Id == request.MaterialRequestId, cancellationToken);
        if (materialRequest is null)
            return Result.Failure<MaterialRequestDto>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(materialRequest.ObjectId))
            return Result.Failure<MaterialRequestDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var result = materialRequest.ForceDeliver();
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
