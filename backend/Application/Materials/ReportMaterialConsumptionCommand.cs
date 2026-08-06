using Application.Common.Interfaces;
using Application.IndividualTasks;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Materials;

// MASTER §9.4/§8.2: POST /material-consumption-reports — Brigadir(C),
// own brigade (their evening routine, one row per material/day). §8.2's
// "Граничный случай: повторный отчёт за тот же материал/день — обновление
// существующей записи, не дубль" — the unique (BrigadeId, ObjectId,
// MaterialName, Date) index means a second submission for the same day
// must update, not insert-and-conflict.
//
// §8.2's MaterialShortageReported ("сразу, не дожидаясь оформления
// заявки") fires here, after SaveChanges, whenever QtyShortage > 0 — on
// both a brand-new report and an update to an existing one (a shortage
// discovered on a recount is just as real as one caught the first time).
// The one-click MaterialRequest proposal from the same MASTER sentence is
// explicitly NOT built here — that's a bot-flow affordance (Phase 4 Step
// 5, deferred with every other [BOT] step), not a backend endpoint; a
// Brigadir can already file the request themselves via
// CreateMaterialRequestCommand (Step 2).
public sealed record ReportMaterialConsumptionCommand(
    Guid ObjectId,
    DateOnly Date,
    string MaterialName,
    string Unit,
    decimal QtyUsed,
    decimal QtyShortage,
    string? Comment) : IRequest<Result<MaterialConsumptionReportDto>>;

public sealed class ReportMaterialConsumptionCommandValidator : AbstractValidator<ReportMaterialConsumptionCommand>
{
    public ReportMaterialConsumptionCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.MaterialName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Unit).NotEmpty().MaximumLength(20);
        RuleFor(x => x.QtyUsed).GreaterThanOrEqualTo(0);
        RuleFor(x => x.QtyShortage).GreaterThanOrEqualTo(0);
    }
}

public sealed class ReportMaterialConsumptionCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IMaterialShortageNotifier shortageNotifier)
    : IRequestHandler<ReportMaterialConsumptionCommand, Result<MaterialConsumptionReportDto>>
{
    public async Task<Result<MaterialConsumptionReportDto>> Handle(ReportMaterialConsumptionCommand request, CancellationToken cancellationToken)
    {
        var brigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (brigadeId is null)
            return Result.Failure<MaterialConsumptionReportDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<MaterialConsumptionReportDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var report = await context.MaterialConsumptionReports.FirstOrDefaultAsync(
            r => r.BrigadeId == brigadeId.Value
                 && r.ObjectId == request.ObjectId
                 && r.MaterialName == request.MaterialName
                 && r.Date == request.Date,
            cancellationToken);

        if (report is null)
        {
            report = MaterialConsumptionReport.Create(
                currentUser.CompanyId!.Value,
                request.ObjectId,
                brigadeId.Value,
                currentUser.UserId!.Value,
                request.Date,
                request.MaterialName,
                request.Unit,
                request.QtyUsed,
                request.QtyShortage,
                request.Comment);

            context.MaterialConsumptionReports.Add(report);
        }
        else
        {
            report.UpdateUsage(request.QtyUsed, request.QtyShortage, request.Comment);
        }

        await context.SaveChangesAsync(cancellationToken);

        if (request.QtyShortage > 0)
        {
            await shortageNotifier.NotifyShortageAsync(
                report.CompanyId,
                report.Id,
                report.ObjectId,
                report.BrigadeId,
                report.MaterialName,
                request.QtyShortage,
                cancellationToken);
        }

        return Result.Success(MaterialConsumptionReportDto.FromEntity(report));
    }
}
