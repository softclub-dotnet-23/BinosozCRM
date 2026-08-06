using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

public sealed class User : AuditableEntity, ISoftDelete
{
    public string FullName { get; private set; } = null!;
    public string Phone { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public Role Role { get; private set; }
    public bool IsActive { get; private set; } = true;
    public bool ForcePasswordChange { get; private set; }
    public bool IsDeleted { get; set; }

    private User() { }

    public static User Create(string fullName, string phone, string passwordHash, Role role, bool forcePasswordChange = false)
    {
        return new User
        {
            Id = Guid.CreateVersion7(),
            FullName = fullName,
            Phone = phone,
            PasswordHash = passwordHash,
            Role = role,
            IsActive = true,
            ForcePasswordChange = forcePasswordChange
        };
    }

    public void ChangeRole(Role role) => Role = role;

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;

    public void SetPassword(string passwordHash, bool forcePasswordChange = false)
    {
        PasswordHash = passwordHash;
        ForcePasswordChange = forcePasswordChange;
    }

    public void ClearForcePasswordChange() => ForcePasswordChange = false;
}
