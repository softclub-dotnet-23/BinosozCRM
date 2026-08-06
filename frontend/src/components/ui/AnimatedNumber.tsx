import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface AnimatedNumberProps {
  value: number;
  formatter?: (value: number) => string;
  durationMs?: number;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Counts from its previous value to `value` on every change (ease-out, ~500ms), instead of
 * swapping digits instantly. Shared by every headline number on a page (KPI cards, donut center,
 * ...) so the counting logic lives in exactly one place. Skips the animation entirely when
 * usePrefersReducedMotion() is true.
 */
export function AnimatedNumber({ value, formatter = (v) => String(Math.round(v)), durationMs = 500, className }: AnimatedNumberProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (to - from) * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, reduceMotion]);

  return <span className={className}>{formatter(display)}</span>;
}
