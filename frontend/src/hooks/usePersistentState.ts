import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { readJson, writeJson } from "../lib/storage/localStorageEngine";

/**
 * Like useState, but the value is persisted to localStorage under the given
 * key and restored on mount. Used for per-page UI state that the user
 * expects to survive a refresh (search text, active tab, filter selections,
 * page size) without needing a full CollectionRepository.
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stored = readJson<T>(key);
    return stored !== undefined ? stored : initialValue;
  });

  useEffect(() => {
    writeJson(key, value);
  }, [key, value]);

  return [value, setValue];
}
