import type { ComponentType, ReactNode } from "react";
import { Card } from "./Card";
import { IconContainer } from "./IconContainer";
import { ProgressBar } from "./ProgressBar";
import { AnimatedNumber } from "./AnimatedNumber";

interface MetricCardProps {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: "orange" | "blue" | "green" | "purple" | "red";
  footer?: ReactNode;
  progress?: number;
  progressLabel?: string;
  /** Opt-in: when set alongside `valueFormatter`, the headline number counts up/down to this
   * value on change instead of the plain `value` string swapping instantly. Omit both to keep
   * every other caller's static-text behavior unchanged. */
  numericValue?: number;
  valueFormatter?: (value: number) => string;
}

export function MetricCard({ label, value, icon, tone, footer, progress, progressLabel, numericValue, valueFormatter }: MetricCardProps) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-start gap-3.5">
        <IconContainer icon={icon} tone={tone} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm leading-snug text-ink-secondary">{label}</p>
          <p className="wrap-break-word text-xl font-bold leading-tight tabular text-ink">
            {typeof numericValue === "number" && valueFormatter ? (
              <AnimatedNumber value={numericValue} formatter={valueFormatter} />
            ) : (
              value
            )}
          </p>
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4">
          <p className="mb-2 text-xs text-ink-secondary">{progressLabel}</p>
          <div className="flex items-center gap-3">
            <ProgressBar value={progress} className="flex-1" />
            <span className="text-xs font-semibold text-ink">{progress}%</span>
          </div>
        </div>
      ) : (
        footer && <div className="mt-3.5 text-xs text-ink-secondary">{footer}</div>
      )}
    </Card>
  );
}
