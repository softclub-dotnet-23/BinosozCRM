using Domain.Entities;

namespace Application.Materials;

public sealed record MaterialConsumptionReportDto(
    Guid Id,
    Guid ObjectId,
    string ObjectName,
    Guid BrigadeId,
    Guid ReportedByUserId,
    DateOnly Date,
    string MaterialName,
    string Unit,
    decimal QtyUsed,
    decimal QtyShortage,
    string? Comment)
{
    public static MaterialConsumptionReportDto FromEntity(MaterialConsumptionReport report, string objectName) => new(
        report.Id,
        report.ObjectId,
        objectName,
        report.BrigadeId,
        report.ReportedByUserId,
        report.Date,
        report.MaterialName,
        report.Unit,
        report.QtyUsed,
        report.QtyShortage,
        report.Comment);
}
