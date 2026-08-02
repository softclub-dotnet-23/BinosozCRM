import { useMediaQuery } from "./useMediaQuery";
import { readJson } from "../lib/storage/localStorageEngine";

/**
 * True when animations should be skipped: either the OS-level "prefers-reduced-motion" media
 * query is on, or the app's own "Анимации интерфейса" setting (Settings → General) is off.
 * Check this once per animated component instead of re-deriving it in each one.
 */
export function usePrefersReducedMotion(): boolean {
  const osReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const appAnimationsOff = readJson<{ animations?: boolean }>("app.settings.v1")?.animations === false;
  return osReducedMotion || appAnimationsOff;
}
