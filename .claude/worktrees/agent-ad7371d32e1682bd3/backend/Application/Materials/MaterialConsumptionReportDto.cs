using Domain.Entities;

namespace Application.Materials;

public sealed record MaterialConsumptionReportDto(
    Guid Id,
    Guid ObjectId,
    Guid BrigadeId,
    Guid ReportedByUserId,
    DateOnly Date,
    string MaterialName,
    string Unit,
    decimal QtyUsed,
    decimal QtyShortage,
    string? Comment)
{
    public static MaterialConsumptionReportDto FromEntity(MaterialConsumptionReport report) => new(
        report.Id,
        report.ObjectId,
        report.BrigadeId,
        report.ReportedByUserId,
        report.Date,
        report.MaterialName,
        report.Unit,
        report.QtyUsed,
        report.QtyShortage,
        report.Comment);
}
