using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.MaterialConsumptionReports;

// MASTER §5.18/§8.2: "ежедневная рутина ... Уникальность (BrigadeId,
// ObjectId, MaterialName, Date)." Phase 4 Step 1's own title calls out the
// key behavior: same day = UPDATE the existing report, never a duplicate
// or a rejection — unlike Timesheet's check-in, which rejects a second
// attempt. A Brigadir filling this in twice in one evening (partial, then
// final numbers) is the normal case, not an error.
public sealed record UpsertMaterialConsumptionReportCommand(
    Guid ObjectId,
    string MaterialName,
    string Unit,
    decimal QtyUsed,
    decimal QtyShortage,
    string? Comment) : IRequest<Result<MaterialConsumptionReportDto>>;

public sealed class UpsertMaterialConsumptionReportCommandValidator : AbstractValidator<UpsertMaterialConsumptionReportCommand>
{
    public UpsertMaterialConsumptionReportCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.MaterialName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.QtyUsed).GreaterThanOrEqualTo(0);
        RuleFor(x => x.QtyShortage).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Comment).MaximumLength(1000);
    }
}

public sealed class UpsertMaterialConsumptionReportCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<UpsertMaterialConsumptionReportCommand, Result<MaterialConsumptionReportDto>>
{
    public async Task<Result<MaterialConsumptionReportDto>> Handle(
        UpsertMaterialConsumptionReportCommand request, CancellationToken cancellationToken)
    {
        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId is null)
            return Result.Failure<MaterialConsumptionReportDto>(new Error("BRIGADE_NOT_FOUND", "You have no brigade to report for."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<MaterialConsumptionReportDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var existing = await context.MaterialConsumptionReports.FirstOrDefaultAsync(
            r => r.BrigadeId == ownBrigadeId && r.ObjectId == request.ObjectId
                 && r.MaterialName == request.MaterialName && r.Date == today,
            cancellationToken);

        if (existing is not null)
        {
            existing.UpdateUsage(request.QtyUsed, request.QtyShortage, request.Comment);
            await context.SaveChangesAsync(cancellationToken);
            return Result.Success(MaterialConsumptionReportDto.FromEntity(existing));
        }

        var report = MaterialConsumptionReport.Create(
            currentUser.CompanyId!.Value, request.ObjectId, ownBrigadeId.Value, currentUser.UserId!.Value,
            today, request.MaterialName, request.Unit, request.QtyUsed, request.QtyShortage, request.Comment);

        context.MaterialConsumptionReports.Add(report);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(MaterialConsumptionReportDto.FromEntity(report));
    }
}
