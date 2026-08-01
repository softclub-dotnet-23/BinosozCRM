import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface ChartAnimationProps {
  isAnimationActive: boolean;
  animationDuration: number;
  animationEasing: "ease-out";
}

/**
 * Shared recharts animation props (bars grow from zero, lines draw left-to-right, donut slices
 * sweep in — all built into recharts itself, nothing hand-rolled here) so every chart component
 * picks a consistent duration/easing instead of relying on recharts' own defaults (1500ms,
 * "ease") and each re-deciding whether to respect prefers-reduced-motion.
 */
export function useChartAnimation(durationMs = 650): ChartAnimationProps {
  const reduceMotion = usePrefersReducedMotion();
  return {
    isAnimationActive: !reduceMotion,
    animationDuration: durationMs,
    animationEasing: "ease-out",
  };
}
