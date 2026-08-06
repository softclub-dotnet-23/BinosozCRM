namespace Api.Contracts.Auth;

public sealed record ForgotPasswordRequest(string Phone);

public sealed record ResetPasswordRequest(string Token, string NewPassword);
