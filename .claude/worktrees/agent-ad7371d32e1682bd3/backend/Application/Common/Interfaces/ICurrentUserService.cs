using Domain.Enums;

namespace Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? CompanyId { get; }
    Role? Role { get; }
}
