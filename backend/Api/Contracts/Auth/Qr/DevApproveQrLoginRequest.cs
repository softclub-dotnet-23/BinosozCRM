namespace Api.Contracts.Auth.Qr;

/// Development-only — see QrLoginController.DevApprove and DevApproveQrLoginSessionCommand.
public sealed record DevApproveQrLoginRequest(Guid SessionId, string QrToken, string Phone, string Password);
