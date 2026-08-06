import { readJson } from "./storage/localStorageEngine";

interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  density: string;
  sidebar: string;
  accent: string;
  animations: boolean;
}

const DEFAULTS: AppearanceSettings = { theme: "light", density: "comfortable", sidebar: "expanded", accent: "#FF5A00", animations: true };

function darkenHex(hex: string): string {
  const value = hex.replace("#", "");
  const number = parseInt(value, 16);
  const r = Math.max(0, (number >> 16) - 18);
  const g = Math.max(0, ((number >> 8) & 255) - 18);
  const b = Math.max(0, (number & 255) - 18);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Applies the real, persisted appearance settings (Settings → General: theme/density/sidebar
 * mode/accent color/animations) to `document.documentElement`. Previously this only ran inside
 * SettingsPage's own `useEffect`, so it silently reverted to defaults on a hard refresh of any
 * *other* page (the effect never re-ran because SettingsPage was never mounted). Calling this
 * once at app startup (App.tsx) makes it apply on every load regardless of the current route;
 * SettingsPage still calls it live while the user is actively changing values on that page.
 */
export function applyAppearanceSettings(settings?: Partial<AppearanceSettings>): void {
  const stored = settings ?? readJson<Partial<AppearanceSettings>>("app.settings.v1") ?? {};
  const merged: AppearanceSettings = { ...DEFAULTS, ...stored };

  const root = document.documentElement;
  const dark = merged.theme === "dark" || (merged.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.appTheme = dark ? "dark" : "light";
  root.dataset.interfaceDensity = merged.density;
  root.dataset.sidebarMode = merged.sidebar;
  root.dataset.animations = merged.animations ? "on" : "off";
  root.style.setProperty("--color-primary", merged.accent);
  root.style.setProperty("--color-primary-hover", darkenHex(merged.accent));
}
