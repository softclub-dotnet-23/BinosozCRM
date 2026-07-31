using Domain.Entities;

namespace Application.Users;

public sealed record UserDto(Guid Id, string FullName, string Phone, string Role, bool IsActive, bool ForcePasswordChange)
{
    public static UserDto FromEntity(User user) => new(
        user.Id,
        user.FullName,
        user.Phone,
        user.Role.ToString(),
        user.IsActive,
        user.ForcePasswordChange);
}
