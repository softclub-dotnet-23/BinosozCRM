using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using MediatR;

namespace Application.Timesheets;

public sealed record GetTimesheetQuery(Guid Id) : IRequest<Result<TimesheetDto>>;

public sealed class GetTimesheetQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetTimesheetQuery, Result<TimesheetDto>>
{
    public async Task<Result<TimesheetDto>> Handle(GetTimesheetQuery request, CancellationToken cancellationToken)
    {
        var result = currentUser.Role switch
        {
            Role.Brigadir => await TimesheetAccess.GetForBrigadirAsync(context, currentUser, request.Id, cancellationToken),
            Role.Worker => await TimesheetAccess.GetForWorkerAsync(context, currentUser, request.Id, cancellationToken),
            _ => await TimesheetAccess.GetForProrabAsync(context, currentUser, request.Id, cancellationToken),
        };

        return result.IsFailure
            ? Result.Failure<TimesheetDto>(result.Error)
            : Result.Success(TimesheetDto.FromEntity(result.Value));
    }
}
