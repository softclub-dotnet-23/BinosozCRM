import { onExternalStorageChange, readJson, writeJson } from "./localStorageEngine";

export interface WithId {
  id: string;
}

/**
 * Storage-agnostic contract for a CRUD collection. The localStorage implementation
 * below (createCollectionRepository) is the only implementation today, but every
 * method is async so a future `createHttpCollectionRepository<T>(baseUrl)` can
 * implement the same interface and be swapped in from data/repositories.ts without
 * touching any page or component.
 */
export interface CollectionRepository<T extends WithId> {
  getSnapshot: () => T[];
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T | undefined>;
  create: (item: T) => Promise<T>;
  update: (id: string, patch: Partial<T>) => Promise<T | undefined>;
  replace: (id: string, item: T) => Promise<T>;
  remove: (id: string) => Promise<void>;
  setAll: (items: T[]) => Promise<T[]>;
  subscribe: (onChange: () => void) => () => void;
}

export function createCollectionRepository<T extends WithId>(
  storageKey: string,
  seed: T[],
): CollectionRepository<T> {
  const stored = readJson<T[]>(storageKey);
  let cache: T[] = stored ?? seed;
  if (stored === undefined) {
    writeJson(storageKey, cache);
  }

  const listeners = new Set<() => void>();

  function commit(next: T[]): T[] {
    cache = next;
    writeJson(storageKey, cache);
    listeners.forEach((listener) => listener());
    return cache;
  }

  // Keep tabs/windows in sync: if another tab writes to this key, reload our cache.
  onExternalStorageChange(storageKey, () => {
    const next = readJson<T[]>(storageKey);
    if (next !== undefined) {
      cache = next;
      listeners.forEach((listener) => listener());
    }
  });

  return {
    getSnapshot() {
      return cache;
    },
    async getAll() {
      return cache;
    },
    async getById(id) {
      return cache.find((item) => item.id === id);
    },
    async create(item) {
      commit([item, ...cache]);
      return item;
    },
    async update(id, patch) {
      let updated: T | undefined;
      const next = cache.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, ...patch };
        return updated;
      });
      commit(next);
      return updated;
    },
    async replace(id, item) {
      const next = cache.map((existing) => (existing.id === id ? item : existing));
      commit(next);
      return item;
    },
    async remove(id) {
      commit(cache.filter((item) => item.id !== id));
    },
    async setAll(items) {
      return commit(items);
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
