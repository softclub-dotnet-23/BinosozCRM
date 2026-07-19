import type { ReceiptStatus, TransferStatus, WriteOffReason } from "../../types";
import { cn } from "../../utils/cn";

const RECEIPT_CONFIG: Record<ReceiptStatus, { label: string; className: string }> = {
  completed: { label: "Оприходовано", className: "bg-green-soft text-green" },
  pending: { label: "Ожидает", className: "bg-warning-soft text-warning" },
  cancelled: { label: "Отменено", className: "bg-red-soft text-red" },
};

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  const config = RECEIPT_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

const TRANSFER_CONFIG: Record<TransferStatus, { label: string; className: string }> = {
  completed: { label: "Завершено", className: "bg-green-soft text-green" },
  in_transit: { label: "В пути", className: "bg-blue-soft text-blue" },
  pending: { label: "Ожидает", className: "bg-warning-soft text-warning" },
  cancelled: { label: "Отменено", className: "bg-red-soft text-red" },
};

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const config = TRANSFER_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

const REASON_LABEL: Record<WriteOffReason, string> = {
  construction_works: "Строительные работы",
  damage: "Повреждение",
  finishing_works: "Отделочные работы",
  defect: "Брак",
  other_works: "Прочие работы",
};

export const WRITE_OFF_REASONS: WriteOffReason[] = ["construction_works", "damage", "finishing_works", "defect", "other_works"];

export function writeOffReasonLabel(reason: WriteOffReason): string {
  return REASON_LABEL[reason];
}

export function ReviewStatusBadge({ requiresReview }: { requiresReview: boolean }) {
  return requiresReview ? (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-soft px-2.5 py-1 text-xs font-semibold text-red">
      Требует проверки
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-green-soft px-2.5 py-1 text-xs font-semibold text-green">
      Проверено
    </span>
  );
}
