using Domain.Common;

namespace Domain.Entities;

public sealed class RefreshToken : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = null!;
    public DateTimeOffset ExpiresAt { get; private set; }
    public string CreatedByIp { get; private set; } = null!;
    public DateTimeOffset? RevokedAt { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }
    public bool IsDeleted { get; set; }

    private RefreshToken() { }

    public static RefreshToken Create(
        Guid companyId,
        Guid userId,
        string tokenHash,
        DateTimeOffset expiresAt,
        string createdByIp)
    {
        return new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedByIp = createdByIp
        };
    }

    public void Revoke(DateTimeOffset revokedAt, Guid? replacedByTokenId = null)
    {
        RevokedAt = revokedAt;
        ReplacedByTokenId = replacedByTokenId;
    }
}
