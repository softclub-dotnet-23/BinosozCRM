using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialRequests;

// MASTER §9.4: "GET,POST /material-requests Brigadir(C) / Prorab+(R)" —
// same asymmetric split as MaterialConsumptionReport: Brigadir only ever
// creates, Prorab+ only ever reads.
public sealed record CreateMaterialRequestCommand(
    Guid ObjectId, string MaterialName, string Unit, decimal Qty) : IRequest<Result<MaterialRequestDto>>;

public sealed class CreateMaterialRequestCommandValidator : AbstractValidator<CreateMaterialRequestCommand>
{
    public CreateMaterialRequestCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.MaterialName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Qty).GreaterThan(0);
    }
}

public sealed class CreateMaterialRequestCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateMaterialRequestCommand, Result<MaterialRequestDto>>
{
    public async Task<Result<MaterialRequestDto>> Handle(CreateMaterialRequestCommand request, CancellationToken cancellationToken)
    {
        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId is null)
            return Result.Failure<MaterialRequestDto>(new Error("BRIGADE_NOT_FOUND", "You have no brigade to request materials for."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<MaterialRequestDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var materialRequest = MaterialRequest.Create(
            currentUser.CompanyId!.Value, request.ObjectId, ownBrigadeId.Value, currentUser.UserId!.Value,
            request.MaterialName, request.Unit, request.Qty, DateTimeOffset.UtcNow);

        context.MaterialRequests.Add(materialRequest);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
