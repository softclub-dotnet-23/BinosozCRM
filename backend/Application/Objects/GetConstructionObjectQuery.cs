using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

public sealed record GetConstructionObjectQuery(Guid Id) : IRequest<Result<ConstructionObjectDto>>;

public sealed class GetConstructionObjectQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetConstructionObjectQuery, Result<ConstructionObjectDto>>
{
    public async Task<Result<ConstructionObjectDto>> Handle(GetConstructionObjectQuery request, CancellationToken cancellationToken)
    {
        var obj = await context.ConstructionObjects.FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (obj is null)
            return Result.Failure<ConstructionObjectDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(obj.Id))
            return Result.Failure<ConstructionObjectDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        return Result.Success(ConstructionObjectDto.FromEntity(obj));
    }
}
