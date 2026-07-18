namespace Application.Common.Options;

// MASTER §11.9: "Фото — подписанный URL с истечением, лимит размера,
// allow-list MIME (не blacklist), хранение вне веб-корня." No storage
// backend is named anywhere in MASTER — local filesystem chosen (see
// PROGRESS.md, Phase 2 Step 4) since no cloud provider is configured
// anywhere in this project yet.
public sealed class PhotoStorageOptions
{
    public const string SectionName = "PhotoStorage";

    // Must be outside the web root (wwwroot) — nothing under this path is
    // ever served by static-file middleware, only via the signed endpoint.
    public string RootPath { get; init; } = string.Empty;

    public long MaxFileSizeBytes { get; init; } = 10 * 1024 * 1024;

    public string[] AllowedContentTypes { get; init; } = ["image/jpeg", "image/png", "image/webp"];

    public int SignedUrlExpiryMinutes { get; init; } = 15;

    // Never in a committed appsettings file — same rule as Jwt:SecretKey
    // (§11.1), set via user-secrets or PhotoStorage__SigningKey env var.
    public string SigningKey { get; init; } = string.Empty;
}
