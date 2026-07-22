import { ProgressBar } from "../ui/ProgressBar";
import { workProgressTone } from "../../utils/brigadeStatus";
import { cn } from "../../utils/cn";
import type { BrigadeStatus } from "../../types";

interface BrigadeProgressBarProps {
  progress: number;
  status: BrigadeStatus;
  className?: string;
  barClassName?: string;
}

export function BrigadeProgressBar({ progress, status, className, barClassName }: BrigadeProgressBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ProgressBar value={progress} tone={workProgressTone(status, progress)} className={barClassName ?? "w-16"} />
      <span className="shrink-0 text-xs font-semibold text-ink tabular">{progress}%</span>
    </div>
  );
}
