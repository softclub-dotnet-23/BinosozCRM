using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §9.4: "POST /individual-tasks/{id}/complete Brigadir → возвращает
// completedEarly." IndividualTaskDto.CompletedEarly (computed by
// IndividualTask.Complete — CompletedAt < DueAt) is already part of the
// response, so no extra field is needed here.
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
        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));

        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId != task.BrigadeId)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Individual task not found."));

        var completedAt = DateTimeOffset.UtcNow;

        return await IndividualTaskTransitionHelper.ApplyAsync(
            context, task, () => task.Complete(completedAt), currentUser.UserId!.Value, cancellationToken);
    }
}
