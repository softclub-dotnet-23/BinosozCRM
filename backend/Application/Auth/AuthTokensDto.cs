namespace Application.Auth;

public sealed record AuthTokensDto(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    bool ForcePasswordChange,
    string Role);
