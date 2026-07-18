using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Objects;

public sealed record CreateConstructionObjectCommand(
    string Name,
    Guid CustomerId,
    string? Address,
    DateOnly? StartDate,
    DateOnly? PlannedEndDate,
    decimal? Budget) : IRequest<Result<ConstructionObjectDto>>;

public sealed class CreateConstructionObjectCommandValidator : AbstractValidator<CreateConstructionObjectCommand>
{
    public CreateConstructionObjectCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Address).MaximumLength(500);
        RuleFor(x => x.Budget).GreaterThanOrEqualTo(0).When(x => x.Budget is not null);
    }
}

public sealed class CreateConstructionObjectCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateConstructionObjectCommand, Result<ConstructionObjectDto>>
{
    public async Task<Result<ConstructionObjectDto>> Handle(CreateConstructionObjectCommand request, CancellationToken cancellationToken)
    {
        if (!await context.Customers.AnyAsync(c => c.Id == request.CustomerId, cancellationToken))
            return Result.Failure<ConstructionObjectDto>(new Error("CUSTOMER_NOT_FOUND", "Customer not found."));

        var obj = ConstructionObject.Create(
            currentUser.CompanyId!.Value,
            request.Name,
            request.CustomerId,
            request.Address,
            request.StartDate,
            request.PlannedEndDate,
            request.Budget);

        context.ConstructionObjects.Add(obj);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(ConstructionObjectDto.FromEntity(obj));
    }
}
