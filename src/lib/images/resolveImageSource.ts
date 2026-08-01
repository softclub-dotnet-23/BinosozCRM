/**
 * Single place that turns any stored/legacy image reference into a URL the
 * browser can actually load. Every page in this app stores image paths as
 * plain strings (Material.imageUrl, ConstructionObject.imageUrl, PERSON_PHOTOS,
 * ...) rather than imported modules, so this resolver — not Vite's
 * import-based asset pipeline — is what decides what ends up in <img src>.
 */

const DEFAULT_IMAGE = "/images/placeholder.svg";

const ABSOLUTE_SCHEME = /^(https?:|data:|blob:)/i;

/** Legacy/author-time prefixes seen in older seed data or a pasted Windows path —
 * stripped down to the bare public-relative path before re-adding a leading slash. */
const LEGACY_PREFIXES = [/^\.\/?src\/assets\//i, /^src\/assets\//i, /^\.\/?public\//i, /^public\//i, /^\.\/?assets\//i, /^assets\//i];

function stripLegacyPrefix(source: string): string {
  for (const prefix of LEGACY_PREFIXES) {
    if (prefix.test(source)) return source.replace(prefix, "");
  }
  return source;
}

export function resolveImageSource(value?: string | null, fallback?: string): string {
  if (!value?.trim()) {
    return fallback ?? DEFAULT_IMAGE;
  }

  let source = value.trim().replace(/\\/g, "/");

  // A Windows absolute path (C:\Users\...) or a raw `/src/assets/...` runtime string can
  // only reach here from stale localStorage data or a copy-pasted author-time value — neither
  // is ever loadable by the browser, so treat them the same as "missing".
  if (/^[a-zA-Z]:\//.test(source) || /^\/?src\/assets\//i.test(source)) {
    return fallback ?? DEFAULT_IMAGE;
  }

  if (ABSOLUTE_SCHEME.test(source)) {
    return source;
  }

  source = stripLegacyPrefix(source);
  if (!source) return fallback ?? DEFAULT_IMAGE;

  return source.startsWith("/") ? source : `/${source}`;
}
