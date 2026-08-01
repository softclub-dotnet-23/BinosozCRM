import type { HTMLAttributes } from "react";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { cn } from "../../utils/cn";

interface MotionSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Extra transition-delay in ms — used to sequence a page's sections (KPIs, then main chart,
   * then secondary cards, then the table) instead of everything fading in at once. */
  delayMs?: number;
}

/**
 * Fades a section up into place the first time it scrolls into view (translateY 14px → 0,
 * opacity 0 → 1, ~450ms ease-out) and never again — plain CSS transition driven by
 * useInViewOnce, no animation library. Falls back to an instant, undelayed appearance under
 * prefers-reduced-motion.
 */
export function MotionSection({ delayMs = 0, className, style, children, ...props }: MotionSectionProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const reduceMotion = usePrefersReducedMotion();
  const shown = inView || reduceMotion;

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-[450ms] ease-out will-change-transform",
        shown ? "translate-y-0 opacity-100" : "translate-y-3.5 opacity-0",
        className,
      )}
      style={{ transitionDelay: shown && !reduceMotion ? `${delayMs}ms` : "0ms", ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
