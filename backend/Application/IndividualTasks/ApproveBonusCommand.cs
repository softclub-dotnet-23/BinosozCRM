using Application.Common.Interfaces;
using Domain.Common;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.IndividualTasks;

// MASTER §9.4/§8.7: POST /individual-tasks/{id}/bonus/approve — Prorab+.
// Point 6: "премия за свою задачу бригадир себе не подтверждает, только
// прораб" — satisfied entirely by role authorization (Brigadir can never
// reach this endpoint, regardless of whose task it is), no extra
// same-person check needed.
//
// Point 4: "подтверждает или меняет сумму." IndividualTask.ApproveBonus()
// takes no amount parameter — to support changing it, an OverrideAmount
// here re-proposes via ProposeBonus() first (Domain doesn't gate that
// call's caller identity), then approves. No Domain change needed.
public sealed record ApproveBonusCommand(Guid TaskId, decimal? OverrideAmount) : IRequest<Result<IndividualTaskDto>>;

public sealed class ApproveBonusCommandValidator : AbstractValidator<ApproveBonusCommand>
{
    public ApproveBonusCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
        RuleFor(x => x.OverrideAmount).GreaterThan(0).When(x => x.OverrideAmount is not null);
    }
}

public sealed class ApproveBonusCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<ApproveBonusCommand, Result<IndividualTaskDto>>
{
    public async Task<Result<IndividualTaskDto>> Handle(ApproveBonusCommand request, CancellationToken cancellationToken)
    {
        var task = await context.IndividualTasks.FirstOrDefaultAsync(t => t.Id == request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure<IndividualTaskDto>(new Error("INDIVIDUAL_TASK_NOT_FOUND", "Task not found."));

        if (request.OverrideAmount is not null)
        {
            var proposeResult = task.ProposeBonus(request.OverrideAmount.Value);
            if (proposeResult.IsFailure)
                return Result.Failure<IndividualTaskDto>(proposeResult.Error);
        }

        var approveResult = task.ApproveBonus(currentUser.UserId!.Value);
        if (approveResult.IsFailure)
            return Result.Failure<IndividualTaskDto>(approveResult.Error);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(IndividualTaskDto.FromEntity(task));
    }
}
