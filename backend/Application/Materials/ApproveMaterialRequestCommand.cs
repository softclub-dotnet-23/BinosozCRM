using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.Materials;

// MASTER §9.4/§7.3: POST /material-requests/{id}/approve — Prorab+,
// scoped by ProrabObjectAssignment on the request's ObjectId.
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
        var accessResult = await MaterialRequestAccess.GetForProrabAsync(context, currentUser, request.MaterialRequestId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<MaterialRequestDto>(accessResult.Error);

        var materialRequest = accessResult.Value;
        var result = materialRequest.Approve(currentUser.UserId!.Value, DateTimeOffset.UtcNow);
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
