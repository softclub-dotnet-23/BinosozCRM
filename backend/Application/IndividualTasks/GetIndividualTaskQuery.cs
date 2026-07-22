using Application.Common.Interfaces;
using Domain.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

public sealed record GetIndividualTaskQuery(Guid Id) : IRequest<Result<IndividualTaskDto>>;

public sealed class GetIndividualTaskQueryHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<GetIndividualTaskQuery, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(GetIndividualTaskQuery request, CancellationToken cancellationToken)
    {
        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);
        if (task is null)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));

        var ownBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != task.BrigadeId)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
