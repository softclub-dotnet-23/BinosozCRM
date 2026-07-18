using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §8.5: Brigadir creates for themselves or any worker in their OWN
// brigade — AssignedToWorkerId.BrigadeId must equal the creator's own
// BrigadeId, else INDIVIDUAL_TASK_WRONG_BRIGADE.
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
    }
}

public sealed class CreateIndividualTaskCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateIndividualTaskCommand, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(CreateIndividualTaskCommand request, CancellationToken cancellationToken)
    {
        var callerBrigadeId = await BrigadeAccess.GetCallerBrigadeIdAsync(context, currentUser, cancellationToken);
        if (callerBrigadeId is null)
            return Result.Failure<IndividualTaskDto>(new Error("WORKER_NOT_FOUND", "No worker record linked to this account."));

        var assignedWorker = await context.Workers.FirstOrDefaultAsync(w => w.Id == request.AssignedToWorkerId, cancellationToken);
        if (assignedWorker is null)
            return Result.Failure<IndividualTaskDto>(new Error("WORKER_NOT_FOUND", "Worker not found."));

        if (assignedWorker.BrigadeId != callerBrigadeId.Value)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_WRONG_BRIGADE", "Cannot assign a task to a worker outside your own brigade."));

        if (request.WorkOrderId is not null && !await context.WorkOrders.AnyAsync(w => w.Id == request.WorkOrderId, cancellationToken))
            return Result.Failure<IndividualTaskDto>(new Error("WORK_ORDER_NOT_FOUND", "Work order not found."));

        // Same per-company sequence as WorkOrder.Code (§5.14) — one shared counter.
        var company = await context.Companies.FirstAsync(cancellationToken);
        var code = company.ReserveNextCode();

        var task = IndividualTask.Create(
            currentUser.CompanyId!.Value,
            code,
            callerBrigadeId.Value,
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
        }
        catch (DbUpdateConcurrencyException)
        {
            return Result.Failure<IndividualTaskDto>(new Error("CONCURRENCY_CONFLICT", "Concurrent update — retry."));
        }

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
