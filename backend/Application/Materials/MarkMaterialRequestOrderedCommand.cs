using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.Materials;

// MASTER §7.3: Approved -> Ordered. Not itemized as its own row in §9.4's
// endpoint table (only /approve, /reject, /force-close are listed) —
// flagged as a real gap, same class as WorkOrder's /assign, /start in
// Phase 2 Step 1: without this, a MaterialRequest can never reach Ordered,
// and MaterialDelivery.RecordDelivery requires exactly that status —
// deliveries could never be recorded against an approved-but-not-ordered
// request. Added now, Prorab+, same scoping as /approve|/reject.
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
        var accessResult = await MaterialRequestAccess.GetForProrabAsync(context, currentUser, request.MaterialRequestId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<MaterialRequestDto>(accessResult.Error);

        var materialRequest = accessResult.Value;
        var result = materialRequest.MarkOrdered();
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
