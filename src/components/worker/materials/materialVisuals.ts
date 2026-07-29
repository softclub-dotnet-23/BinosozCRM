import { MATERIAL_CATEGORIES } from "../../../data/mockMaterials";

interface CategoryVisual {
  /** Tailwind classes for a soft icon badge (category pill, material row accents). */
  badgeClass: string;
  /** Solid-color dot class (kept as its own literal string, not derived from badgeClass at
   * runtime, so Tailwind's static class scanner can actually see and keep it). */
  dotClass: string;
  /** ProgressBar `tone` prop — kept as its own list since ProgressBar's palette names don't line
   * up 1:1 with the badge soft/text pairs (e.g. ProgressBar has no "purple"). */
  progressTone: "primary" | "green" | "blue" | "red" | "orange" | "gray";
}

const PALETTE: CategoryVisual[] = [
  { badgeClass: "bg-blue-soft text-blue", dotClass: "bg-blue", progressTone: "blue" },
  { badgeClass: "bg-warning-soft text-warning", dotClass: "bg-warning", progressTone: "orange" },
  { badgeClass: "bg-green-soft text-green", dotClass: "bg-green", progressTone: "green" },
  { badgeClass: "bg-purple-soft text-purple", dotClass: "bg-purple", progressTone: "primary" },
  { badgeClass: "bg-red-soft text-red", dotClass: "bg-red", progressTone: "red" },
  { badgeClass: "bg-primary-soft text-primary", dotClass: "bg-primary", progressTone: "primary" },
];

/** Deterministic real-category → color assignment (cycled across the app's existing soft-tone
 * tokens) built once from the real MATERIAL_CATEGORIES list, so every material/category/progress
 * element on the page agrees on the same color for a given category without re-deriving it. */
const CATEGORY_VISUAL_MAP: Record<string, CategoryVisual> = Object.fromEntries(
  MATERIAL_CATEGORIES.map((category, i) => [category, PALETTE[i % PALETTE.length]]),
);

const FALLBACK_VISUAL: CategoryVisual = PALETTE[0];

export function getCategoryVisual(category: string): CategoryVisual {
  return CATEGORY_VISUAL_MAP[category] ?? FALLBACK_VISUAL;
}
