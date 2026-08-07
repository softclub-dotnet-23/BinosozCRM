namespace Api.Contracts.Auth.Qr;

/// Shared by scan/exchange (SessionId comes from the route there, so only
/// QrToken is read from this) and approve/reject (both fields read from body).
public sealed record QrLoginSessionActionRequest(Guid SessionId, string QrToken);
