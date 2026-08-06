namespace Api.Contracts.Customers;

public sealed record CreateCustomerRequest(string Name, string? ContactPerson, string? ContactPhone);
