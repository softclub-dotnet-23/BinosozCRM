using Application.Common;
using Application.Common.Interfaces;
using Application.Workers;
using Domain.Common;
using Domain.Enums;
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
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));

        // §4: "не видит чужие бригады (404, не 403)" — a task genuinely
        // missing and a task belonging to another brigade/worker look
        // identical. Worker is narrower than Brigadir: own task only, not
        // the whole brigade's.
        if (currentUser.Role == Role.Worker)
        {
            var ownWorkerId = await WorkerAccess.GetCallerWorkerIdAsync(context, currentUser, cancellationToken);
            if (ownWorkerId != task.AssignedToWorkerId)
                return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));
        }
        else
        {
            var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
            if (callerBrigadeId is null || task.BrigadeId != callerBrigadeId.Value)
                return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));
        }

        var fromStatus = task.Status;
        var result = task.Start(DateTimeOffset.UtcNow);
        if (result.IsFailure)
            return Result.Failure<IndividualTaskDto>(result.Error);

        TaskLogWriter.Append(
            context,
            task.CompanyId,
            TaskLogEntityType.IndividualTask,
            task.Id,
            fromStatus.ToString(),
            task.Status.ToString(),
            currentUser.UserId!.Value);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
