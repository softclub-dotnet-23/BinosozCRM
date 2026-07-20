using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.Materials;

// MASTER §9.4: "POST /material-requests/{id}/force-close Prorab+ ←
// недопоставка, комментарий обязателен." §7.3: "Прораб может вручную
// закрыть в Delivered при недопоставке ... с обязательным комментарием."
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
        var accessResult = await MaterialRequestAccess.GetForProrabAsync(context, currentUser, request.MaterialRequestId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<MaterialRequestDto>(accessResult.Error);

        var materialRequest = accessResult.Value;

        var result = materialRequest.ForceDeliver(request.Comment);
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
