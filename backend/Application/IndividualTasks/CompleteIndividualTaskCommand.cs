using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §8.5/§7.2: CompletedEarly is computed at closing (comparing
// CompletedAt to DueAt) — never recalculated later, so a retroactive DueAt
// edit can't rewrite history. IndividualTask.Complete() already does this.
public sealed record CompleteIndividualTaskCommand(Guid TaskId) : IRequest<Result<IndividualTaskDto>>;

public sealed class CompleteIndividualTaskCommandValidator : AbstractValidator<CompleteIndividualTaskCommand>
{
    public CompleteIndividualTaskCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
    }
}

public sealed class CompleteIndividualTaskCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CompleteIndividualTaskCommand, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(CompleteIndividualTaskCommand request, CancellationToken cancellationToken)
    {
        var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (callerBrigadeId is null)
            return Result.Failure<IndividualTaskDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);

        if (task is null || task.BrigadeId != callerBrigadeId.Value)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));

        var result = task.Complete(DateTimeOffset.UtcNow);
        if (result.IsFailure)
            return Result.Failure<IndividualTaskDto>(result.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
