using Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Api.IntegrationTests;

// Shared test JwtOptions — 32+ bytes, satisfies the same validation Infrastructure's
// DependencyInjection.cs enforces on startup (MASTER §11.1).
internal static class AuthTestOptions
{
    public static IOptions<JwtOptions> Jwt { get; } = Microsoft.Extensions.Options.Options.Create(new JwtOptions
    {
        SecretKey = "this-is-a-test-only-secret-key-at-least-32-bytes",
        Issuer = "BrigadaCRM.Tests",
        Audience = "BrigadaCRM.Tests.Clients",
        AccessTokenMinutes = 15,
        RefreshTokenDays = 30
    });
}
