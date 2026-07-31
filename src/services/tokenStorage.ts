const ACCESS_TOKEN_KEY = "binosoz:auth-access-token";
const ACCESS_TOKEN_EXPIRES_KEY = "binosoz:auth-access-token-expires-at";
const REFRESH_TOKEN_KEY = "binosoz:auth-refresh-token";

export interface StoredTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

/** Same remember-me split as session.ts: localStorage survives tab close, sessionStorage doesn't. */
function storageFor(remember: boolean): Storage | null {
  try {
    return remember ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function currentStorage(): Storage | null {
  try {
    if (window.sessionStorage.getItem(ACCESS_TOKEN_KEY)) return window.sessionStorage;
    if (window.localStorage.getItem(ACCESS_TOKEN_KEY)) return window.localStorage;
    return null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens, remember: boolean): void {
  const target = storageFor(remember);
  if (!target) return;
  const other = storageFor(!remember);
  other?.removeItem(ACCESS_TOKEN_KEY);
  other?.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
  other?.removeItem(REFRESH_TOKEN_KEY);
  target.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  target.setItem(ACCESS_TOKEN_EXPIRES_KEY, tokens.accessTokenExpiresAt);
  target.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/** Updates just the access token in-place after a refresh, preserving whichever storage
 * (local vs session) already held the refresh token — a refresh must never move the
 * session between "remember me" tiers. */
export function updateAccessToken(accessToken: string, accessTokenExpiresAt: string): void {
  const target = currentStorage();
  if (!target) return;
  target.setItem(ACCESS_TOKEN_KEY, accessToken);
  target.setItem(ACCESS_TOKEN_EXPIRES_KEY, accessTokenExpiresAt);
}

export function readAccessToken(): string | null {
  return currentStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function readRefreshToken(): string | null {
  return currentStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function clearTokens(): void {
  try {
    for (const key of [ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXPIRES_KEY, REFRESH_TOKEN_KEY]) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // storage unavailable (e.g. private browsing) — nothing to clear
  }
}
