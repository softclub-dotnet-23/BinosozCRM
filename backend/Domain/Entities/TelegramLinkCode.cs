using Domain.Common;

namespace Domain.Entities;

public sealed class TelegramLinkCode : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid UserId { get; private set; }
    public string CodeHash { get; private set; } = null!;
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? UsedAt { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public bool IsDeleted { get; set; }

    private TelegramLinkCode() { }

    public static TelegramLinkCode Create(
        Guid companyId,
        Guid userId,
        string codeHash,
        DateTimeOffset expiresAt,
        Guid createdByUserId)
    {
        return new TelegramLinkCode
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            UserId = userId,
            CodeHash = codeHash,
            ExpiresAt = expiresAt,
            CreatedByUserId = createdByUserId
        };
    }

    public void MarkUsed(DateTimeOffset usedAt) => UsedAt = usedAt;
}
