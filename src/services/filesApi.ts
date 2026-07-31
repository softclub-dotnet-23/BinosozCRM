const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;

/** Infrastructure/Files/LocalFileStorageService.cs's GetSignedUrl returns a path-absolute URL
 * like "/api/v1/files/{key}?exp=...&sig=..." — it already includes the "/api/v1" prefix itself.
 * apiClient's baseURL also ends in "/api/v1", so naively concatenating them would produce
 * ".../api/v1/api/v1/files/...". This strips just the origin+base back off apiBaseUrl and
 * prepends only the server origin, matching what the backend actually returns. */
const apiOrigin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");

/**
 * FilesController is [AllowAnonymous] — the signature+expiry in the query string IS the
 * authorization, not a JWT. Never route this through apiClient (which attaches
 * Authorization: Bearer): the backend doesn't check it here, and img/anchor tags can't set
 * custom headers anyway. Callers must always resolve a fresh signed URL from the DTO field
 * that produced it (e.g. WorkOrderProgressDto.photoUrls, AbsenceRecordDto.documentUrl) rather
 * than caching one — Infrastructure mints a new one on every read, valid for
 * FileStorage:SignedUrlExpiryMinutes (~15 min per appsettings.json).
 */
export function resolveSignedFileUrl(pathFromBackend: string): string {
  if (/^https?:\/\//i.test(pathFromBackend)) return pathFromBackend;
  return `${apiOrigin}${pathFromBackend}`;
}

/** True once a previously-resolved signed URL has likely expired, so the UI can prompt a
 * refetch instead of showing a broken image/link. Parses the "exp" query param the backend
 * embeds (Unix seconds) rather than tracking expiry separately. */
export function isSignedUrlExpired(resolvedUrl: string): boolean {
  try {
    const url = new URL(resolvedUrl);
    const exp = Number(url.searchParams.get("exp"));
    if (!Number.isFinite(exp)) return false;
    return Date.now() / 1000 > exp;
  } catch {
    return false;
  }
}
