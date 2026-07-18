using Application.Common;
using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §8.5: "Бригадир создаёт и себе, и любому рабочему своей бригады
// (AssignedToWorkerId.BrigadeId == creator.BrigadeId, иначе
// INDIVIDUAL_TASK_WRONG_BRIGADE)." BrigadeId itself isn't client-supplied —
// it's always the creator's own brigade, so a Brigadir can't create a task
// under a brigade they don't belong to.
public sealed record CreateIndividualTaskCommand(
    Guid AssignedToWorkerId,
    string Title,
    string? Description,
    Guid? WorkOrderId,
    DateTimeOffset? DueAt) : IRequest<Result<IndividualTaskDto>>;

public sealed class CreateIndividualTaskCommandValidator : AbstractValidator<CreateIndividualTaskCommand>
{
    public CreateIndividualTaskCommandValidator()
    {
        RuleFor(x => x.AssignedToWorkerId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(2000);
    }
}

public sealed class CreateIndividualTaskCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateIndividualTaskCommand, Result<IndividualTaskDto>>
{
    private const int MaxCodeAttempts = 3;

    public async Task<Result<IndividualTaskDto>> Handle(CreateIndividualTaskCommand request, CancellationToken cancellationToken)
    {
        var ownBrigadeId = await BrigadirAccess.GetOwnBrigadeIdAsync(context, currentUser, cancellationToken);
        if (ownBrigadeId is null)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_WRONG_BRIGADE", "You have no brigade to create tasks for."));

        var assignedWorker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.AssignedToWorkerId, cancellationToken);
        if (assignedWorker is null)
            return Result.Failure<IndividualTaskDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        if (assignedWorker.BrigadeId != ownBrigadeId)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_WRONG_BRIGADE", "Worker belongs to a different brigade."));

        if (request.WorkOrderId is not null && !await context.WorkOrders.AnyAsync(w => w.Id == request.WorkOrderId, cancellationToken))
            return Result.Failure<IndividualTaskDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        // Same best-effort MAX+1/retry pattern as CreateWorkOrderCommand —
        // see BusinessCodeGenerator for why the two entities share one
        // sequence and why a race here becomes a DbUpdateException.
        for (var attempt = 0; attempt < MaxCodeAttempts; attempt++)
        {
            var code = await BusinessCodeGenerator.NextCodeAsync(context, currentUser.CompanyId!.Value, cancellationToken);

            var task = IndividualTask.Create(
                currentUser.CompanyId!.Value,
                code,
                ownBrigadeId.Value,
                request.AssignedToWorkerId,
                request.Title,
                currentUser.UserId!.Value,
                request.WorkOrderId,
                request.Description,
                request.DueAt);

            context.IndividualTasks.Add(task);

            try
            {
                await context.SaveChangesAsync(cancellationToken);
                return Result.Success(IndividualTaskDto.FromEntity(task));
            }
            catch (DbUpdateException) when (attempt < MaxCodeAttempts - 1)
            {
                context.IndividualTasks.Remove(task);
            }
        }

        throw new InvalidOperationException($"Could not generate a unique individual task code after {MaxCodeAttempts} attempts.");
    }
}
