namespace Domain.Enums;

// "Expired" is deliberately not a member here — it's derived at read time from
// ExpiresAt (see Application.Auth.Qr.GetQrLoginSessionStatusQuery), so a session
// that simply times out while Pending/Scanned never needs a background job to
// flip a column.
public enum QrLoginSessionStatus
{
    Pending,
    Scanned,
    Approved,
    Rejected
}
