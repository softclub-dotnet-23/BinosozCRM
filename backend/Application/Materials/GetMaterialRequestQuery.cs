using Application.Common.Interfaces;
using Domain.Common;
using MediatR;

namespace Application.Materials;

public sealed record GetMaterialRequestQuery(Guid Id) : IRequest<Result<MaterialRequestDto>>;

public sealed class GetMaterialRequestQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetMaterialRequestQuery, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(GetMaterialRequestQuery request, CancellationToken cancellationToken)
    {
        var accessResult = await MaterialRequestAccess.GetForProrabAsync(context, currentUser, request.Id, cancellationToken);
        return accessResult.IsFailure
            ? Result.Failure<MaterialRequestDto>(accessResult.Error)
            : Result.Success(MaterialRequestDto.FromEntity(accessResult.Value));
    }
}
