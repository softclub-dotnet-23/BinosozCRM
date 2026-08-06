using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;

namespace Application.Timesheets;

// MASTER §9.4: POST /timesheets/{id}/approve — Prorab+, scoped by
// ProrabObjectAssignment on the timesheet's own ObjectId (same pattern as
// every other Prorab+ write in this codebase).
public sealed record ApproveTimesheetCommand(Guid TimesheetId) : IRequest<Result<TimesheetDto>>;

public sealed class ApproveTimesheetCommandValidator : AbstractValidator<ApproveTimesheetCommand>
{
    public ApproveTimesheetCommandValidator()
    {
        RuleFor(x => x.TimesheetId).NotEmpty();
    }
}

public sealed class ApproveTimesheetCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveTimesheetCommand, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(ApproveTimesheetCommand request, CancellationToken cancellationToken)
    {
        var accessResult = await TimesheetAccess.GetForProrabAsync(context, currentUser, request.TimesheetId, cancellationToken);
        if (accessResult.IsFailure)
            return Result.Failure<TimesheetDto>(accessResult.Error);

        var timesheet = accessResult.Value;
        timesheet.Approve(currentUser.UserId!.Value, DateTimeOffset.UtcNow);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(TimesheetDto.FromEntity(timesheet));
    }
}
