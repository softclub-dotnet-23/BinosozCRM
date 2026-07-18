using Domain.Common;

namespace Domain.Entities;

public sealed class TelegramLink : AuditableEntity, ICompanyOwned, ISoftDelete
{
    public Guid CompanyId { get; private set; }
    public Guid UserId { get; private set; }
    public long TelegramChatId { get; private set; }
    public DateTimeOffset LinkedAt { get; private set; }
    public bool IsDeleted { get; set; }

    private TelegramLink() { }

    public static TelegramLink Create(Guid companyId, Guid userId, long telegramChatId, DateTimeOffset linkedAt)
    {
        return new TelegramLink
        {
            Id = Guid.CreateVersion7(),
            CompanyId = companyId,
            UserId = userId,
            TelegramChatId = telegramChatId,
            LinkedAt = linkedAt
        };
    }
}
