namespace Api.Contracts.Auth.Qr;

/// scan and exchange take SessionId from the route — only the secret is in the body.
public sealed record QrTokenRequest(string QrToken);
