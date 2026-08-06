using Domain.Entities;
using Domain.Enums;

namespace Application.Users;

public sealed record UserDto(Guid Id, string FullName, string Phone, Role Role, bool IsActive, bool ForcePasswordChange, DateTimeOffset CreatedAt)
{
    public static UserDto FromEntity(User user) => new(
        user.Id,
        user.FullName,
        user.Phone,
        user.Role,
        user.IsActive,
        user.ForcePasswordChange,
        user.CreatedAt);
}
