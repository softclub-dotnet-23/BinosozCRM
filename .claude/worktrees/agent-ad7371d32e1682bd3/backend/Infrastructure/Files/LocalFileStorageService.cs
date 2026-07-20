using System.Security.Cryptography;
using System.Text;
using Application.Common.Interfaces;
using Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Infrastructure.Files;

// MASTER §11.9: stores outside the web root (RootPath is never under
// wwwroot/served by static-file middleware — this API has neither), serves
// only through FilesController's signed, expiring URL. The "signature" is
// an HMAC over key+expiry, not a lookup — nothing is persisted per-URL, so
// TryValidateSignedUrl works for any URL this instance ever minted as long
// as it hasn't expired and the secret hasn't rotated.
public sealed class LocalFileStorageService(IOptions<FileStorageOptions> options) : IFileStorageService
{
    private readonly FileStorageOptions _options = options.Value;

    public async Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken)
    {
        var extension = ExtensionFor(contentType);
        var key = $"{Guid.CreateVersion7()}{extension}";
        var path = ResolvePath(key);

        Directory.CreateDirectory(_options.RootPath);

        await using var fileStream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, bufferSize: 81920, useAsync: true);
        await content.CopyToAsync(fileStream, cancellationToken);

        return key;
    }

    public string GetSignedUrl(string key)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.SignedUrlExpiryMinutes).ToUnixTimeSeconds();
        var signature = Sign(key, expiresAt);
        return $"/api/v1/files/{Uri.EscapeDataString(key)}?exp={expiresAt}&sig={signature}";
    }

    public bool TryValidateSignedUrl(string key, long expiresAtUnixSeconds, string signature)
    {
        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiresAtUnixSeconds)
            return false;

        var expected = Sign(key, expiresAtUnixSeconds);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(signature);

        return expectedBytes.Length == actualBytes.Length
            && CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    public Task<(Stream Content, string ContentType)> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        var path = ResolvePath(key);
        if (!File.Exists(path))
            throw new FileNotFoundException("File not found.", key);

        Stream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 81920, useAsync: true);
        return Task.FromResult((stream, ContentTypeFor(key)));
    }

    // Guards against path traversal: a key that resolves to a different
    // file name once directory components are stripped is rejected outright
    // rather than silently sanitized — every key this service ever hands out
    // is already a bare "{guid}{extension}", so any mismatch means the
    // caller (or an attacker probing the /files endpoint) supplied something
    // we didn't mint.
    private string ResolvePath(string key)
    {
        var fileName = Path.GetFileName(key);
        if (string.IsNullOrEmpty(fileName) || fileName != key)
            throw new InvalidOperationException("Invalid file key.");

        return Path.Combine(_options.RootPath, fileName);
    }

    private string Sign(string key, long expiresAtUnixSeconds)
    {
        var payload = $"{key}:{expiresAtUnixSeconds}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.SignedUrlSecret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private static string ExtensionFor(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => throw new InvalidOperationException($"Unsupported content type '{contentType}'.")
    };

    private static string ContentTypeFor(string key) => Path.GetExtension(key) switch
    {
        ".jpg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        _ => "application/octet-stream"
    };
}
