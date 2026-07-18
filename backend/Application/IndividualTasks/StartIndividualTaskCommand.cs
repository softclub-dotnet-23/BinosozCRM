using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

public sealed record StartIndividualTaskCommand(Guid TaskId) : IRequest<Result<IndividualTaskDto>>;

public sealed class StartIndividualTaskCommandValidator : AbstractValidator<StartIndividualTaskCommand>
{
    public StartIndividualTaskCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
    }
}

public sealed class StartIndividualTaskCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<StartIndividualTaskCommand, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(StartIndividualTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));

        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != task.BrigadeId)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));

        var startedAt = DateTimeOffset.UtcNow;

        return await IndividualTaskTransitionHelper.ApplyAsync(
            context, task, () => task.Start(startedAt), currentUser.UserId!.Value, cancellationToken);
    }
}
