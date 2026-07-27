import type { PayrollStatus } from "../../types";
import { cn } from "../../utils/cn";

const STATUS_CONFIG: Record<PayrollStatus, { label: string; className: string }> = {
  prepared: { label: "Подготовлено", className: "bg-blue-soft text-blue" },
  needs_review: { label: "Требует проверки", className: "bg-red-soft text-red" },
  pending_approval: { label: "На утверждении", className: "bg-warning-soft text-warning" },
  approved: { label: "Утверждено", className: "bg-purple-soft text-purple" },
  returned: { label: "Возвращено", className: "bg-red-soft text-red" },
  paid: { label: "Выплачено", className: "bg-green-soft text-green" },
  cancelled: { label: "Отменено", className: "bg-[#F5F5F4] text-ink-muted" },
};

export const PAYROLL_STATUSES: PayrollStatus[] = [
  "prepared",
  "needs_review",
  "pending_approval",
  "approved",
  "returned",
  "paid",
  "cancelled",
];

export function payrollStatusLabel(status: PayrollStatus): string {
  return STATUS_CONFIG[status].label;
}

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}
