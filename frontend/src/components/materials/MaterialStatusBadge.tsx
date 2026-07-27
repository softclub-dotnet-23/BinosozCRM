import type { MaterialStatus } from "../../types";
import { cn } from "../../utils/cn";

const STATUS_CONFIG: Record<MaterialStatus, { label: string; className: string }> = {
  normal: { label: "В норме", className: "bg-green-soft text-green" },
  low: { label: "Низкий остаток", className: "bg-warning-soft text-warning" },
  critical: { label: "Критический", className: "bg-red-soft text-red" },
};

export function MaterialStatusBadge({ status }: { status: MaterialStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}
