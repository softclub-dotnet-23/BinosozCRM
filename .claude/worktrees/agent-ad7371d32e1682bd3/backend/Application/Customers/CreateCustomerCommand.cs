using Application.Common.Interfaces;
using Domain.Common;
using Domain.Entities;
using FluentValidation;
using MediatR;

namespace Application.Customers;

public sealed record CreateCustomerCommand(string Name, string? ContactPerson, string? ContactPhone) : IRequest<Result<CustomerDto>>;

public sealed class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContactPerson).MaximumLength(200);
        RuleFor(x => x.ContactPhone).MaximumLength(20);
    }
}

public sealed class CreateCustomerCommandHandler(IApplicationDbContext context, ICurrentUserService currentUser)
    : IRequestHandler<CreateCustomerCommand, Result<CustomerDto>>
{
    public async Task<Result<CustomerDto>> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = Customer.Create(currentUser.CompanyId!.Value, request.Name, request.ContactPerson, request.ContactPhone);

        context.Customers.Add(customer);
        await context.SaveChangesAsync(cancellationToken);

        return Result.Success(CustomerDto.FromEntity(customer));
    }
}
