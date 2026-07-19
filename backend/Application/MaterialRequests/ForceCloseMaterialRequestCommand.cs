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
// MaterialRequest.Comment + ForceDeliver(string) landed from Ahmad
// (Domain/Persistence/migration — his files) same session this gap was
// flagged; this line updated to match as a one-time cross-zone exception,
// since the two changes are atomic (the solution doesn't build split
// across a commit boundary otherwise).
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

        var result = materialRequest.ForceDeliver(request.Comment);
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
