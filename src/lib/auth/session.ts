import type { SessionUser } from "../../types";

const SESSION_KEY = "binosoz:auth-session";

export interface StoredSession {
  user: SessionUser;
  issuedAt: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  forcePasswordChange: boolean;
}

export interface NewSession {
  user: SessionUser;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  forcePasswordChange: boolean;
}

function storageFor(remember: boolean): Storage | null {
  try {
    return remember ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

// Whichever storage currently holds the session (set by readFromStorage/saveSession),
// so markForcePasswordChange/updateTokens know where to persist without re-deriving it.
let activeStorage: Storage | null = null;

function readFromStorage(): StoredSession | null {
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) {
      activeStorage = window.sessionStorage;
    } else if (window.localStorage.getItem(SESSION_KEY)) {
      activeStorage = window.localStorage;
    } else {
      activeStorage = null;
    }
    const raw = activeStorage?.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

// Module-level cache, mirroring createCollectionRepository.ts's `cache`/`commit()`
// pattern: getters return this same reference until something actually changes, so
// useSyncExternalStore doesn't see a "new" snapshot (and re-render/tear) on every call.
let cache: StoredSession | null = readFromStorage();

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key === SESSION_KEY || event.key === null) {
    cache = readFromStorage();
    notify();
  }
}

try {
  window.addEventListener("storage", handleStorageEvent);
} catch {
  // no window (non-browser context) — nothing to attach
}

/** Persists a fresh session in exactly one of localStorage (remember me) or sessionStorage (this tab only). */
export function saveSession(session: NewSession, remember: boolean): void {
  const target = storageFor(remember);
  if (!target) return;
  const other = storageFor(!remember);
  other?.removeItem(SESSION_KEY);
  activeStorage = target;
  cache = { ...session, issuedAt: new Date().toISOString() };
  target.setItem(SESSION_KEY, JSON.stringify(cache));
  notify();
}

/** Updates the access/refresh tokens in place after a successful /auth/refresh — user and forcePasswordChange are untouched. */
export function updateTokens(tokens: { accessToken: string; accessTokenExpiresAt: string; refreshToken: string }): void {
  if (!cache || !activeStorage) return;
  cache = { ...cache, ...tokens };
  activeStorage.setItem(SESSION_KEY, JSON.stringify(cache));
  notify();
}

/** Flips forcePasswordChange in place — used both right after login and if a later request 403s PASSWORD_CHANGE_REQUIRED. */
export function markForcePasswordChange(value: boolean): void {
  if (!cache || !activeStorage) return;
  cache = { ...cache, forcePasswordChange: value };
  activeStorage.setItem(SESSION_KEY, JSON.stringify(cache));
  notify();
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable (e.g. private browsing) — nothing to clear
  }
  activeStorage = null;
  cache = null;
  notify();
}

export function readUser(): SessionUser | null {
  return cache?.user ?? null;
}

export function getAccessToken(): string | null {
  return cache?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return cache?.refreshToken ?? null;
}

export function getForcePasswordChange(): boolean {
  return cache?.forcePasswordChange ?? false;
}

/** Fires on same-tab session changes (save/update/clear) and cross-tab localStorage writes alike. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
