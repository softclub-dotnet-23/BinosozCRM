using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// MASTER §8.10/§9.4: GET /objects/{id}/cost-breakdown — Prorab+. A pure
// read-model query, not stored anywhere ("иначе денормализация, которая
// разъедется при любой правке задним числом"). Fixes the pre-existing bug
// §8.10 calls out: "факт" used to be materials + WorkOrder totals WITHOUT
// payroll, understating true cost by the entire wage bill.
//
// "Зарплата учтена только за закрытые периоды (PayrollEntry.Status =
// Paid)" — an open month isn't in the fact, on purpose, so the number
// doesn't jump every day; that's what Note communicates back to the
// caller rather than silently showing a number that looks final but
// isn't.
public sealed record GetObjectCostBreakdownQuery(Guid ObjectId) : IRequest<Result<ObjectCostBreakdownDto>>;

public sealed class GetObjectCostBreakdownQueryValidator : AbstractValidator<GetObjectCostBreakdownQuery>
{
    public GetObjectCostBreakdownQueryValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
    }
}

public sealed class GetObjectCostBreakdownQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetObjectCostBreakdownQuery, Result<ObjectCostBreakdownDto>>
{
    private const string ClosedPeriodsOnlyNote = "Зарплата учтена только за закрытые периоды (PayrollEntry.Status = Paid).";

    public async Task<Result<ObjectCostBreakdownDto>> Handle(GetObjectCostBreakdownQuery request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<ObjectCostBreakdownDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(request.ObjectId))
            return Result.Failure<ObjectCostBreakdownDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        var (materialCost, pieceworkCost, hourlyCost, absenceCost) = await ObjectCostCalculator.ComputeAsync(context, request.ObjectId, cancellationToken);
        var totalCost = materialCost + pieceworkCost + hourlyCost + absenceCost;

        return Result.Success(new ObjectCostBreakdownDto(
            request.ObjectId, materialCost, pieceworkCost, hourlyCost, absenceCost, totalCost, ClosedPeriodsOnlyNote));
    }
}
