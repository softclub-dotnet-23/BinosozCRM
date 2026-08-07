using Domain.Common;
using Domain.Enums;

namespace Domain.Entities;

// QR login: a web client (unauthenticated) starts a session; an already-authenticated
// mobile client scans and approves it; the web client exchanges it for a real
// AuthTokensDto. Deliberately NOT ICompanyOwned — unlike RefreshToken/PasswordResetToken
// (always created for an already-known user), a session's tenant is unknown until
// Approve() sets it from the approving caller's own JWT claims, the same reason
// Login/RefreshToken bypass the CompanyId query filter entirely (Application.Auth).
public sealed class QrLoginSession : AuditableEntity
{
    public string TokenHash { get; private set; } = null!;
    public QrLoginSessionStatus Status { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public string CreatedByIp { get; private set; } = null!;
    public Guid? ApprovedUserId { get; private set; }
    public Guid? ApprovedCompanyId { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public DateTimeOffset? ExchangedAt { get; private set; }

    private QrLoginSession() { }

    public static QrLoginSession Create(string tokenHash, DateTimeOffset expiresAt, string createdByIp)
    {
        return new QrLoginSession
        {
            Id = Guid.CreateVersion7(),
            TokenHash = tokenHash,
            Status = QrLoginSessionStatus.Pending,
            ExpiresAt = expiresAt,
            CreatedByIp = createdByIp
        };
    }

    public void MarkScanned()
    {
        if (Status == QrLoginSessionStatus.Pending)
            Status = QrLoginSessionStatus.Scanned;
    }

    public void Approve(Guid userId, Guid companyId, DateTimeOffset approvedAt)
    {
        Status = QrLoginSessionStatus.Approved;
        ApprovedUserId = userId;
        ApprovedCompanyId = companyId;
        ApprovedAt = approvedAt;
    }

    public void Reject() => Status = QrLoginSessionStatus.Rejected;

    public void MarkExchanged(DateTimeOffset exchangedAt) => ExchangedAt = exchangedAt;
}
