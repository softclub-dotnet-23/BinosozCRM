import { cn } from "../../utils/cn";

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
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#F0F0EE]", trackClassName, className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", TONE_CLASSNAMES[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
