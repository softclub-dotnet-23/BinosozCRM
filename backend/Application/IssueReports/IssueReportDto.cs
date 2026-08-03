using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Application.IssueReports;

public sealed record IssueReportDto(
    Guid Id,
    Guid ObjectId,
    Guid? IndividualTaskId,
    Guid ReportedByUserId,
    string Title,
    string Description,
    string? PhotoUrl,
    IssueReportStatus Status,
    DateTimeOffset ReportedAt,
    DateTimeOffset? ResolvedAt,
    Guid? ResolvedByUserId)
{
    // PhotoUrl, like WorkOrderProgress.PhotoUrls, is an opaque storage key on
    // the entity — signed at read time, never persisted as a signed URL.
    public static IssueReportDto FromEntity(IssueReport report, IFileStorageService fileStorage) => new(
        report.Id,
        report.ObjectId,
        report.IndividualTaskId,
        report.ReportedByUserId,
        report.Title,
        report.Description,
        report.PhotoUrl is null ? null : fileStorage.GetSignedUrl(report.PhotoUrl),
        report.Status,
        report.ReportedAt,
        report.ResolvedAt,
        report.ResolvedByUserId);
}
