using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

// MASTER §9.4: POST /objects/{id}/prorabs — Owner only.
public sealed record AssignProrabCommand(Guid ObjectId, Guid ProrabUserId) : IRequest<Result<ProrabAssignmentDto>>;

public sealed class AssignProrabCommandValidator : AbstractValidator<AssignProrabCommand>
{
    public AssignProrabCommandValidator()
    {
        RuleFor(x => x.ObjectId).NotEmpty();
        RuleFor(x => x.ProrabUserId).NotEmpty();
    }
}

public sealed class AssignProrabCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<AssignProrabCommand, Result<ProrabAssignmentDto>>
{
    public async Task<Result<ProrabAssignmentDto>> Handle(AssignProrabCommand request, CancellationToken cancellationToken)
    {
        if (!await context.ConstructionObjects.AnyAsync(o => o.Id == request.ObjectId, cancellationToken))
            return Result.Failure<ProrabAssignmentDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        // No check that ProrabUserId actually has Role == Prorab — not a
        // stated MASTER invariant, same call as Brigade.AssignBrigadir
        // (Phase 1 Step 3) and Worker.UserId (Step 2): would be inventing a
        // rule that isn't written down.
        if (!await context.Users.AnyAsync(u => u.Id == request.ProrabUserId, cancellationToken))
            return Result.Failure<ProrabAssignmentDto>(new Error("USER_NOT_FOUND", "User not found."));

        var alreadyAssigned = await context.ProrabObjectAssignments
            .AnyAsync(a => a.ProrabUserId == request.ProrabUserId && a.ObjectId == request.ObjectId, cancellationToken);
        if (alreadyAssigned)
            return Result.Failure<ProrabAssignmentDto>(new Error("PRORAB_ALREADY_ASSIGNED", "This prorab is already assigned to this object."));

        var assignment = ProrabObjectAssignment.Create(
            currentUser.CompanyId!.Value,
            request.ProrabUserId,
            request.ObjectId,
            DateTimeOffset.UtcNow,
            currentUser.UserId!.Value);

        context.ProrabObjectAssignments.Add(assignment);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(ProrabAssignmentDto.FromEntity(assignment));
    }
}
