import type { ComponentType } from "react";

interface IconSummaryRowProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
}

export function IconSummaryRow({ icon: Icon, label, value, valueClassName }: IconSummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-ink-secondary">
        <Icon size={14} className="shrink-0 text-ink-muted" />
        {label}
      </span>
      <span className={valueClassName ?? "font-semibold text-ink tabular"}>{value}</span>
    </div>
  );
}
