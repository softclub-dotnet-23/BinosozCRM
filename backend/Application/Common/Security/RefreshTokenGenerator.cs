using System.Security.Cryptography;
using System.Text;

namespace Application.Common.Security;

public static class RefreshTokenGenerator
{
    public static string GenerateToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    // Every caller of this (refresh, logout, password-reset) takes an
    // arbitrary client-supplied string — a malformed one must fail as an
    // ordinary "not found" lookup, not an unhandled 500. A token this
    // codebase actually issued is always valid base64 (GenerateToken's own
    // output), so falling back to hashing the raw UTF-8 bytes on a decode
    // failure can never collide with a real token's hash — it just gives
    // garbage input a hash that won't match anything in the database.
    public static string Hash(string token)
    {
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(token);
        }
        catch (FormatException)
        {
            bytes = Encoding.UTF8.GetBytes(token);
        }

        return Convert.ToHexStringLower(SHA256.HashData(bytes));
    }
}
