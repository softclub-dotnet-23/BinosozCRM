using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.Materials;

// MASTER §9.4/§7.3: POST /material-requests/{id}/reject — Prorab+, scoped
// by ProrabObjectAssignment. Unlike WorkOrder.Reject, §9.4/§7.3 don't
// require a reason here — no TaskLog-equivalent audit trail exists for
// MaterialRequest, and MASTER doesn't call for one, so nothing invented.
public sealed record RejectMaterialRequestCommand(Guid MaterialRequestId) : IRequest<Result<MaterialRequestDto>>;

public sealed class RejectMaterialRequestCommandValidator : AbstractValidator<RejectMaterialRequestCommand>
{
    public RejectMaterialRequestCommandValidator()
    {
        RuleFor(x => x.MaterialRequestId).NotEmpty();
    }
}

public sealed class RejectMaterialRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<RejectMaterialRequestCommand, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(RejectMaterialRequestCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await MaterialRequestAccess.GetForProrabAsync(context, currentUser, request.MaterialRequestId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<MaterialRequestDto>(accessResult.Error);

        var materialRequest = accessResult.Value;
        var result = materialRequest.Reject();
        if (result.IsFailure)
            return Result.Failure<MaterialRequestDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
