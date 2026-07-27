import type { AttendanceStatus } from "../../types";
import { cn } from "../../utils/cn";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: "Присутствовал", className: "bg-green-soft text-green" },
  late: { label: "Опоздание", className: "bg-warning-soft text-warning" },
  absent: { label: "Отсутствовал", className: "bg-red-soft text-red" },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}
