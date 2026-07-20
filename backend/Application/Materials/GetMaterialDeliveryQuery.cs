using Application.Common.Interfaces;
using Application.Objects;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

public sealed record GetMaterialDeliveryQuery(Guid Id) : IRequest<Result<MaterialDeliveryDto>>;

public sealed class GetMaterialDeliveryQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetMaterialDeliveryQuery, Result<MaterialDeliveryDto>>
{
    public async Task<Result<MaterialDeliveryDto>> Handle(GetMaterialDeliveryQuery request, CancellationToken cancellationToken)
    {
        var delivery = await context.MaterialDeliveries.FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken);
        if (delivery is null)
            return Result.Failure<MaterialDeliveryDto>(new Error("MATERIAL_DELIVERY_NOT_FOUND", "Material delivery not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(delivery.ObjectId))
            return Result.Failure<MaterialDeliveryDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(MaterialDeliveryDto.FromEntity(delivery));
    }
}
