using System.Security.Cryptography;

namespace Application.Common.Security;

// Owner-created accounts (Application/Users/CreateUserCommand.cs,
// RegenerateTemporaryPasswordCommand.cs) have no email/SMS channel to bootstrap
// a password through — the value this generates is relayed by the Owner
// out-of-band and is always paired with ForcePasswordChange=true, so it only
// ever needs to survive being read/typed once, not resist long-term reuse.
public static class TemporaryPasswordGenerator
{
    // Excludes visually ambiguous characters (0/O, 1/l/I) since this is read
    // aloud or hand-typed by the Owner relaying it, not copy-pasted.
    private const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    public static string Generate(int length = 12)
    {
        var bytes = RandomNumberGenerator.GetBytes(length);
        var result = new char[length];
        for (var i = 0; i < length; i++)
            result[i] = Alphabet[bytes[i] % Alphabet.Length];
        return new string(result);
    }
}
