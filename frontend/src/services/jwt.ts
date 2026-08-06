/** Reads claims out of a JWT's payload segment without verifying the signature — safe here
 * because the token only ever reaches this code after arriving in a trusted response from our
 * own backend (POST /auth/login or /auth/refresh), not from an untrusted source. Gives the
 * frontend the user's own id (NameIdentifier claim) without needing a GET /users/me endpoint,
 * which the backend does not have. */
export interface AccessTokenClaims {
  userId: string | null;
  companyId: string | null;
}

export function decodeAccessTokenClaims(accessToken: string): AccessTokenClaims {
  try {
    const payloadSegment = accessToken.split(".")[1];
    if (!payloadSegment) return { userId: null, companyId: null };

    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    const claims = JSON.parse(json) as Record<string, string>;

    return {
      // ClaimTypes.NameIdentifier serializes to this long URI form in the JWT, not "sub".
      userId: claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? null,
      companyId: claims["company_id"] ?? null,
    };
  } catch {
    return { userId: null, companyId: null };
  }
}
