namespace Application.Common.Interfaces;

// MASTER §11.9: photos stored outside the web root, served only via a
// signed URL that expires — SaveAsync/OpenReadAsync never take or return a
// publicly-browsable path, only an opaque key. GetSignedUrl mints a fresh,
// time-limited URL from that key on every call — callers must not cache or
// persist the URL itself (only the key, e.g. WorkOrderProgress.PhotoUrls).
public interface IFileStorageService
{
    Task<string> SaveAsync(Stream content, string contentType, CancellationToken cancellationToken);

    string GetSignedUrl(string key);

    bool TryValidateSignedUrl(string key, long expiresAtUnixSeconds, string signature);

    Task<(Stream Content, string ContentType)> OpenReadAsync(string key, CancellationToken cancellationToken);
}
