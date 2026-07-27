/**
 * Demo-only password map, keyed by login. This is intentionally NOT a
 * CollectionRepository and is never written to localStorage/sessionStorage —
 * only authService reads it, to check a submitted password before minting a
 * session. Swapping in a real backend later means deleting this file and
 * pointing authService.authenticate at an HTTP call instead; nothing else
 * in the app depends on password values.
 */
export const DEMO_CREDENTIALS: Record<string, string> = {
  "sadi.imomov": "owner123",
  admin: "admin123",
  "firuz.rakhmonov": "prorab123",
  "shakhrom.mirzoev": "brigadir123",
  "mekhriniso.karimova": "buh123",
  "said.khasanov": "sklad123",
  "inactive.demo": "demo123",
  "blocked.demo": "demo123",
};
