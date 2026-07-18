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
        var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (callerBrigadeId is null)
            return Result.Failure<IndividualTaskDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);

        // §4: "не видит чужие бригады (404, не 403)" — a task genuinely
        // missing and a task belonging to another brigade look identical.
        if (task is null || task.BrigadeId != callerBrigadeId.Value)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));

        var result = task.Start(DateTimeOffset.UtcNow);
        if (result.IsFailure)
            return Result.Failure<IndividualTaskDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
