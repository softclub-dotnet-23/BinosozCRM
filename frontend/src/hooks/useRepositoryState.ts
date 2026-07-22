import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import type { CollectionRepository, WithId } from "../lib/storage/createCollectionRepository";

/**
 * Read-only subscription to a repository, for pages that reference another
 * entity's collection (e.g. Works reading Objects) without owning or
 * mutating it. Keeps cross-page references live and refresh-consistent
 * without each page needing its own copy of another page's state.
 */
export function useRepositorySnapshot<T extends WithId>(repository: CollectionRepository<T>): T[] {
  return useSyncExternalStore(repository.subscribe, repository.getSnapshot, repository.getSnapshot);
}

/**
 * Drop-in replacement for `useState<T[]>(mockData)` backed by a shared
 * CollectionRepository. Returns the same [items, setItems] tuple shape
 * (setItems accepts a value or an updater function), so existing page code
 * that calls setX((prev) => ...) keeps working unchanged, while every
 * change is persisted to localStorage and broadcast to every other
 * component subscribed to the same repository (other pages, other tabs).
 */
export function useRepositoryState<T extends WithId>(
  repository: CollectionRepository<T>,
): [T[], Dispatch<SetStateAction<T[]>>] {
  const items = useSyncExternalStore(repository.subscribe, repository.getSnapshot, repository.getSnapshot);

  const setItems: Dispatch<SetStateAction<T[]>> = useCallback(
    (valueOrUpdater) => {
      const next =
        typeof valueOrUpdater === "function"
          ? (valueOrUpdater as (prev: T[]) => T[])(repository.getSnapshot())
          : valueOrUpdater;
      void repository.setAll(next);
    },
    [repository],
  );

  return [items, setItems];
}
