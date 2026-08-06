using Domain.Common;

namespace Domain.Entities;

public sealed class PasswordResetToken : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = null!;
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? UsedAt { get; private set; }
    public bool IsDeleted { get; set; }

    private PasswordResetToken() { }

    public static PasswordResetToken Create(Guid companyId, Guid userId, string tokenHash, DateTimeOffset expiresAt)
    {
        return new PasswordResetToken
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt
        };
    }

    public void MarkUsed(DateTimeOffset usedAt) => UsedAt = usedAt;
}
