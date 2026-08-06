using Domain.Entities;

namespace Application.Customers;

public sealed record CustomerDto(Guid Id, string Name, string? ContactPerson, string? ContactPhone)
{
    public static CustomerDto FromEntity(Customer customer) => new(
        customer.Id,
        customer.Name,
        customer.ContactPerson,
        customer.ContactPhone);
}
