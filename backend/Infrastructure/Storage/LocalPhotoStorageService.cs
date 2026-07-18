using System.Security.Cryptography;
using System.Text;
using Application.Common.Interfaces;
using Application.Common.Options;
using Microsoft.Extensions.Options;

namespace Infrastructure.Storage;

// MASTER §11.9 — see PhotoStorageOptions for why local filesystem, not a
// cloud provider. Files live under a configured RootPath, named by a fresh
// Guid (never the client's original file name — avoids path traversal and
// collisions), extension derived from the validated content type, not from
// client input.
public sealed class LocalPhotoStorageService(IOptions<PhotoStorageOptions> options) : IPhotoStorageService
{
    private readonly PhotoStorageOptions _options = options.Value;

    public long MaxFileSizeBytes => _options.MaxFileSizeBytes;

    public bool IsAllowedContentType(string contentType) =>
        _options.AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);

    public async Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken)
    {
        if (!IsAllowedContentType(contentType))
            throw new ArgumentException($"Content type '{contentType}' is not allowed.", nameof(contentType));

        var storageKey = $"{Guid.CreateVersion7()}{ExtensionFor(contentType)}";

        Directory.CreateDirectory(_options.RootPath);
        var fullPath = Path.Combine(_options.RootPath, storageKey);

        await using var fileStream = File.Create(fullPath);
        await content.CopyToAsync(fileStream, cancellationToken);

        return storageKey;
    }

    public Stream OpenRead(string storageKey) => File.OpenRead(ResolvePath(storageKey));

    public string GenerateSignedDownloadUrl(string storageKey)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.SignedUrlExpiryMinutes).ToUnixTimeSeconds();
        var signature = ComputeSignature(storageKey, expiresAt);
        return $"/api/v1/photos/{Uri.EscapeDataString(storageKey)}?exp={expiresAt}&sig={signature}";
    }

    public bool ValidateSignature(string storageKey, long expiresAtUnixSeconds, string signature)
    {
        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiresAtUnixSeconds)
            return false;

        var expected = ComputeSignature(storageKey, expiresAtUnixSeconds);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signature), Encoding.UTF8.GetBytes(expected));
    }

    private string ComputeSignature(string storageKey, long expiresAtUnixSeconds)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.SigningKey));
        var payload = $"{storageKey}:{expiresAtUnixSeconds}";
        return Convert.ToHexStringLower(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    // Guards against path traversal — a storage key is always exactly what
    // SaveAsync generated (a Guid + extension), never a client-suppliable path.
    private string ResolvePath(string storageKey)
    {
        if (storageKey.Contains('/') || storageKey.Contains('\\') || storageKey.Contains(".."))
            throw new ArgumentException("Invalid storage key.", nameof(storageKey));

        return Path.Combine(_options.RootPath, storageKey);
    }

    private static string ExtensionFor(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => throw new ArgumentException($"No extension mapping for content type '{contentType}'.", nameof(contentType))
    };
}
