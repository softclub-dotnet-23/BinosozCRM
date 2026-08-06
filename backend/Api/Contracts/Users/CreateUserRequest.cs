using Domain.Enums;

namespace Api.Contracts.Users;

public sealed record CreateUserRequest(string FullName, string Phone, Role Role);
