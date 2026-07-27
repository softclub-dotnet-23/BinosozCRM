import type { MaterialRequestStatus, ReceiptStatus, TransferStatus, WriteOffReason } from "../../types";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";

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

/** `label` is an optional override (e.g. a translated string) — omit it to keep the default Russian label used by the untranslated admin inventory pages. */
export function TransferStatusBadge({ status, label }: { status: TransferStatus; label?: string }) {
  const config = TRANSFER_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {label ?? config.label}
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

const REQUEST_CONFIG: Record<MaterialRequestStatus, { label: string; className: string }> = {
  new: { label: "Новая", className: "bg-primary-soft text-primary" },
  approved: { label: "Одобрена", className: "bg-green-soft text-green" },
  in_transit: { label: "В пути", className: "bg-blue-soft text-blue" },
  issued: { label: "Выдана", className: "bg-surface-4 text-ink-secondary" },
  rejected: { label: "Отклонена", className: "bg-red-soft text-red" },
};

/** Owned by the Brigadir Materials feature (not shared with the untranslated admin inventory pages), so it reads its label straight from the active language rather than taking a prop override. */
export function MaterialRequestStatusBadge({ status }: { status: MaterialRequestStatus }) {
  const { strings } = useLanguage();
  const s = strings.brigadirMaterials;
  const REQUEST_LABEL: Record<MaterialRequestStatus, string> = {
    new: s.requestStatusNew,
    approved: s.requestStatusApproved,
    in_transit: s.requestStatusInTransit,
    issued: s.requestStatusIssued,
    rejected: s.requestStatusRejected,
  };
  const config = REQUEST_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {REQUEST_LABEL[status]}
    </span>
  );
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
