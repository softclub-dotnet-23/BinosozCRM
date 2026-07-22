import type { SessionUser } from "../../types";

const SESSION_KEY = "binosoz:auth-session";

interface StoredSession {
  user: SessionUser;
  issuedAt: string;
}

function storageFor(remember: boolean): Storage | null {
  try {
    return remember ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Persists the session in exactly one of localStorage (remember me) or sessionStorage (this tab only). */
export function saveSession(user: SessionUser, remember: boolean): void {
  const target = storageFor(remember);
  if (!target) return;
  const other = storageFor(!remember);
  other?.removeItem(SESSION_KEY);
  target.setItem(SESSION_KEY, JSON.stringify({ user, issuedAt: new Date().toISOString() } satisfies StoredSession));
}

/** Reads whichever storage currently holds a session — sessionStorage first since it's the more common case (not "remember me"). */
export function readSession(): SessionUser | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed.user ?? null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable (e.g. private browsing) — nothing to clear
  }
}

export function onSessionStorageChange(listener: () => void): () => void {
  function handler(event: StorageEvent) {
    if (event.key === SESSION_KEY || event.key === null) listener();
  }
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
