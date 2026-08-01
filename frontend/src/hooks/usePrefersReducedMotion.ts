import { useMediaQuery } from "./useMediaQuery";

/** True when the OS-level "prefers-reduced-motion" setting is on — entrance/chart animations
 * should be skipped (or reduced to an instant state change) for users who asked for this. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
