using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.IssueReports;

public sealed record ResolveIssueReportCommand(Guid IssueReportId) : IRequest<Result<IssueReportDto>>;

public sealed class ResolveIssueReportCommandValidator : AbstractValidator<ResolveIssueReportCommand>
{
    public ResolveIssueReportCommandValidator()
    {
        RuleFor(x => x.IssueReportId).NotEmpty();
    }
}

public sealed class ResolveIssueReportCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUser,
    IFileStorageService fileStorage)
    : IRequestHandler<ResolveIssueReportCommand, Result<IssueReportDto>>
{
    public async Task<Result<IssueReportDto>> Handle(ResolveIssueReportCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await IssueReportAccess.GetForProrabAsync(context, currentUser, request.IssueReportId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<IssueReportDto>(accessResult.Error);

        var report = accessResult.Value;
        var result = report.Resolve(currentUser.UserId!.Value, DateTimeOffset.UtcNow);
        if (result.IsFailure)
            return Result.Failure<IssueReportDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);
        return Result.Success(IssueReportDto.FromEntity(report, fileStorage));
    }
}
