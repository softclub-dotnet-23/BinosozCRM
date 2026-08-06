using Application.Common.Interfaces;
using Domain.Common;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

public sealed record UpdateConstructionObjectCommand(
    Guid Id,
    string Name,
    string? Address,
    ConstructionObjectStatus Status,
    DateOnly? StartDate,
    DateOnly? PlannedEndDate,
    DateOnly? ActualEndDate,
    decimal? Budget) : IRequest<Result<ConstructionObjectDto>>;

public sealed class UpdateConstructionObjectCommandValidator : AbstractValidator<UpdateConstructionObjectCommand>
{
    public UpdateConstructionObjectCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Address).MaximumLength(500);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.Budget).GreaterThanOrEqualTo(0).When(x => x.Budget is not null);
    }
}

public sealed class UpdateConstructionObjectCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<UpdateConstructionObjectCommand, Result<ConstructionObjectDto>>
{
    public async Task<Result<ConstructionObjectDto>> Handle(UpdateConstructionObjectCommand request, CancellationToken cancellationToken)
    {
        var obj = await context.ConstructionObjects.FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (obj is null)
            return Result.Failure<ConstructionObjectDto>(new Error("OBJECT_NOT_FOUND", "Construction object not found."));

        var allowedObjectIds = await ProrabObjectAccess.GetAllowedObjectIdsAsync(context, currentUser, cancellationToken);
        if (allowedObjectIds is not null && !allowedObjectIds.Contains(obj.Id))
            return Result.Failure<ConstructionObjectDto>(new Error("PRORAB_NOT_ASSIGNED_TO_OBJECT", "You are not assigned to this object."));

        obj.Update(request.Name, request.Address, request.StartDate, request.PlannedEndDate, request.ActualEndDate, request.Budget);

        // Status is a separate aggregate method (Rule 3) — Update() only ever
        // touches the plain descriptive fields.
        if (request.Status == ConstructionObjectStatus.Completed && request.ActualEndDate is not null)
            obj.Complete(request.ActualEndDate.Value);
        else
            obj.ChangeStatus(request.Status);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(ConstructionObjectDto.FromEntity(obj));
    }
}
