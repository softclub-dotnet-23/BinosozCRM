import { ProgressBar } from "../ui/ProgressBar";
import { progressTone } from "../../utils/workStatus";
import { cn } from "../../utils/cn";
import type { WorkStatus } from "../../types";

interface WorkProgressBarProps {
  progress: number;
  status: WorkStatus;
  className?: string;
  barClassName?: string;
}

export function WorkProgressBar({ progress, status, className, barClassName }: WorkProgressBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ProgressBar value={progress} tone={progressTone(status, progress)} className={barClassName ?? "w-16"} />
      <span className="shrink-0 text-xs font-semibold text-ink tabular">{progress}%</span>
    </div>
  );
}
