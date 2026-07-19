using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialRequests;

public sealed record GetMaterialRequestQuery(Guid Id) : IRequest<Result<MaterialRequestDto>>;

public sealed class GetMaterialRequestQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetMaterialRequestQuery, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(GetMaterialRequestQuery request, CancellationToken cancellationToken)
    {
        var materialRequest = await context.MaterialRequests.FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);
        if (materialRequest is null)
            return Result.Failure<MaterialRequestDto>(new Error("MATERIAL_REQUEST_NOT_FOUND", "Material request not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(materialRequest.ObjectId))
            return Result.Failure<MaterialRequestDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
