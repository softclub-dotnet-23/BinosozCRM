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
// must update, not insert-and-conflict. MaterialShortageReported and the
// one-click MaterialRequest proposal (§8.2's "если QtyShortage > 0")
// aren't wired here — that's Steps 2/4's job, not this one.
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

public sealed class ReportMaterialConsumptionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
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

        return Result.Success(MaterialConsumptionReportDto.FromEntity(report));
    }
}
