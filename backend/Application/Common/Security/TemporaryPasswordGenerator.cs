using System.Security.Cryptography;

namespace Application.Common.Security;

// MASTER (POST /users context, §11): "пароль-приглашение" + ForcePasswordChange=true, same
// spirit as SeedDataService's ENV-supplied Owner passwords — never hardcoded, never reused,
// and this one's only surfaced once, in the CreateUserCommand response, never persisted in
// plaintext (only its Argon2id hash, via IPasswordHasher, is stored).
public static class TemporaryPasswordGenerator
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

    public static string Generate(int length = 12)
    {
        Span<char> chars = stackalloc char[length];
        for (var i = 0; i < length; i++)
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];

        return new string(chars);
    }
}
