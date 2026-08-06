using Application.Common.Interfaces;
using Application.IndividualTasks;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4/§8.2: POST /material-requests — Brigadir(C), own brigade.
// A one-off decision process ("нужно закупить, дайте добро"), distinct
// from MaterialConsumptionReport's daily routine (Step 1). No
// MaterialConsumptionReport link is required to file one — §8.2's own
// example is the shortage-triggered flow, but a direct request (e.g.
// planning ahead) is valid too, nothing in MASTER ties this to a report.
public sealed record CreateMaterialRequestCommand(
    Guid ObjectId,
    string MaterialName,
    string Unit,
    decimal Qty) : IRequest<Result<MaterialRequestDto>>;

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
        var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (brigadeId is null)
            return Result.Failure<MaterialRequestDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<MaterialRequestDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var materialRequest = MaterialRequest.Create(
            currentUser.CompanyId!.Value,
            request.ObjectId,
            brigadeId.Value,
            currentUser.UserId!.Value,
            request.MaterialName,
            request.Unit,
            request.Qty,
            DateTimeOffset.UtcNow);

        context.MaterialRequests.Add(materialRequest);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(MaterialRequestDto.FromEntity(materialRequest));
    }
}
