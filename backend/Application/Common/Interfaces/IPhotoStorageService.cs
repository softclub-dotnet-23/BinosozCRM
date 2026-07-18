namespace Application.Common.Interfaces;

public interface IPhotoStorageService
{
    long MaxFileSizeBytes { get; }

    bool IsAllowedContentType(string contentType);

    // Returns a stable storage key (not a URL) — what gets persisted in
    // WorkOrderProgress.PhotoUrls despite the field's name. A literal signed
    // URL baked into the DB would go dead once it expires; the key lets a
    // fresh signed URL be minted on every read instead (see
    // GenerateSignedDownloadUrl).
    Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken);

    string GenerateSignedDownloadUrl(string storageKey);

    bool ValidateSignature(string storageKey, long expiresAtUnixSeconds, string signature);

    Stream OpenRead(string storageKey);
}
