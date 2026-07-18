using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

public sealed record CreateEstimateItemCommand(
    Guid ObjectId,
    string WorkType,
    string Unit,
    decimal PlannedQty,
    decimal PlannedUnitPrice,
    string? Stage) : IRequest<Result<EstimateItemDto>>;

public sealed class CreateEstimateItemCommandValidator : AbstractValidator<CreateEstimateItemCommand>
{
    public CreateEstimateItemCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.WorkType).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.PlannedQty).GreaterThanOrEqualTo(0);
        RuleFor(x => x.PlannedUnitPrice).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Stage).MaximumLength(100);
    }
}

public sealed class CreateEstimateItemCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateEstimateItemCommand, Result<EstimateItemDto>>
{
    public async Task<Result<EstimateItemDto>> Handle(CreateEstimateItemCommand request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<EstimateItemDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var item = EstimateItem.Create(
            currentUser.CompanyId!.Value,
            request.ObjectId,
            request.WorkType,
            request.Unit,
            request.PlannedQty,
            request.PlannedUnitPrice,
            request.Stage);

        context.EstimateItems.Add(item);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(EstimateItemDto.FromEntity(item));
    }
}
