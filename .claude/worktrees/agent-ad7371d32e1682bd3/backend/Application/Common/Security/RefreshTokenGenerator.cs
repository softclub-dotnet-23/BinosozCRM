using System.Security.Cryptography;

namespace Application.Common.Security;

public static class RefreshTokenGenerator
{
    public static string GenerateToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public static string Hash(string token) => Convert.ToHexStringLower(SHA256.HashData(Convert.FromBase64String(token)));
}
