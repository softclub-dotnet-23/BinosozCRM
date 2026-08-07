namespace Application.Auth.Qr;

// QrToken is the raw, one-time secret — returned exactly once, here, to the web
// client that started the session. Never persisted in plaintext (only its hash,
// on QrLoginSession.TokenHash) and never logged. QrPayload embeds it for the
// mobile scanner; it carries no accessToken/refreshToken/password, only this
// opaque session secret.
public sealed record QrLoginStartDto(Guid SessionId, string QrToken, string QrPayload, DateTimeOffset ExpiresAt);
