using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialRequests;

public sealed record ApproveMaterialRequestCommand(Guid MaterialRequestId) : IRequest<Result<MaterialRequestDto>>;

public sealed class ApproveMaterialRequestCommandValidator : AbstractValidator<ApproveMaterialRequestCommand>
{
    public ApproveMaterialRequestCommandValidator()
    {
        RuleFor(x => x.MaterialRequestId).NotEmpty();
    }
}

public sealed class ApproveMaterialRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveMaterialRequestCommand, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(ApproveMaterialRequestCommand request, CancellationToken cancellationToken)
    {
        var materialRequest = await context.MaterialRequests.FirstOrDefaultAsync(r => r.Id == request.MaterialRequestId, cancellationToken);
        if (materialRequest is null)
            return Result.Failure<MaterialRequestDto>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(materialRequest.ObjectId))
            return Result.Failure<MaterialRequestDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var result = materialRequest.Approve(currentUser.UserId!.Value, DateTimeOffset.UtcNow);
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
