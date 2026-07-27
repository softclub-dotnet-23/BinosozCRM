const NAMESPACE = "binosoz";

function buildKey(key: string): string {
  return `${NAMESPACE}:${key}`;
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readJson<T>(key: string): T | undefined {
  if (!hasLocalStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(buildKey(key));
    if (raw == null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeJson<T>(key: string, value: T): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(buildKey(key), JSON.stringify(value));
  } catch {
    // Quota exceeded or storage unavailable (e.g. private browsing) - in-memory
    // state keeps working for the current session, it just won't survive a refresh.
  }
}

export function onExternalStorageChange(key: string, listener: () => void): () => void {
  if (!hasLocalStorage()) return () => {};
  const fullKey = buildKey(key);
  const handler = (event: StorageEvent) => {
    if (event.key === fullKey) listener();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
