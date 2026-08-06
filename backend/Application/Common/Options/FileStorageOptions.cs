namespace Application.Common.Options;

public sealed class FileStorageOptions
{
    public const string SectionName = "FileStorage";

    public string RootPath { get; init; } = string.Empty;
    public string SignedUrlSecret { get; init; } = string.Empty;
    public int SignedUrlExpiryMinutes { get; init; } = 15;
    public long MaxFileSizeBytes { get; init; } = 5 * 1024 * 1024;
    public string[] AllowedContentTypes { get; init; } = ["image/jpeg", "image/png", "image/webp"];
}
