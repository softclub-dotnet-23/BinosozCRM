import type { StaffStatus } from "../../types";
import { cn } from "../../utils/cn";

const STATUS_CONFIG: Record<StaffStatus, { label: string; className: string }> = {
  active: { label: "Активен", className: "bg-green-soft text-green" },
  vacation: { label: "Отпуск", className: "bg-warning-soft text-warning" },
  dismissed: { label: "Уволен", className: "bg-red-soft text-red" },
};

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}
