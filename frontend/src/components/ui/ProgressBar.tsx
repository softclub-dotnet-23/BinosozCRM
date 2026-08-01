import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

type ProgressTone = "primary" | "green" | "blue" | "red" | "orange" | "gray";

const TONE_CLASSNAMES: Record<ProgressTone, string> = {
  primary: "bg-primary",
  green: "bg-green",
  blue: "bg-blue",
  red: "bg-red",
  orange: "bg-warning",
  gray: "bg-[#C4C4C1]",
};

interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  className?: string;
  trackClassName?: string;
}

export function ProgressBar({ value, tone = "primary", className, trackClassName }: ProgressBarProps) {
  const reduceMotion = usePrefersReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  // Starts at 0% on mount and grows to the real value on the next paint, so the fill visibly
  // animates in the first time it appears instead of just sitting at its final width — the
  // width transition below only fired on later value *changes*, not on mount.
  const [width, setWidth] = useState(reduceMotion ? clamped : 0);

  useEffect(() => {
    if (reduceMotion) {
      setWidth(clamped);
      return;
    }
    const raf = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(raf);
  }, [clamped, reduceMotion]);

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#F0F0EE]", trackClassName, className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", TONE_CLASSNAMES[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
