import { Children, isValidElement, type HTMLAttributes, type ReactNode } from "react";
import { useInViewOnce } from "../../hooks/useInViewOnce";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { cn } from "../../utils/cn";

interface StaggeredGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Delay step between consecutive items, in ms. Recommended 60–110ms. */
  staggerMs?: number;
  /** Delay before the first item starts, in ms — for sequencing this grid after an earlier section. */
  baseDelayMs?: number;
}

/**
 * Wraps a grid/row of cards (KPI tiles, stat cards) so they fade up into place with a small
 * stagger the first time the grid scrolls into view, using a single shared IntersectionObserver
 * for the whole group rather than one per card. Each child keeps its own layout — this only adds
 * a thin wrapper `div` per item (transparent to CSS Grid/Flex, since the wrapper itself becomes
 * the grid/flex item) for the opacity/transform transition.
 */
export function StaggeredGrid({ children, className, staggerMs = 70, baseDelayMs = 0, ...props }: StaggeredGridProps) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const reduceMotion = usePrefersReducedMotion();
  const shown = inView || reduceMotion;
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <div ref={ref} className={className} {...props}>
      {items.map((child, index) => (
        <div
          key={child.key ?? index}
          className={cn(
            "min-w-0 transition-[opacity,transform] duration-[420ms] ease-out",
            shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
          style={{ transitionDelay: shown && !reduceMotion ? `${baseDelayMs + index * staggerMs}ms` : "0ms" }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
