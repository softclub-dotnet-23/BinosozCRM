import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { cn } from "../../../utils/cn";
import { useLanguage } from "../../../context/LanguageContext";
import type { PhotoReportStatus } from "../../../types";

export const PHOTO_STATUS_ICON = { pending: Clock3, approved: CheckCircle2, rejected: XCircle } as const;
export const PHOTO_STATUS_CLASS: Record<PhotoReportStatus, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-green-soft text-green",
  rejected: "bg-red-soft text-red",
};

export function PhotoReportStatusBadge({ status }: { status: PhotoReportStatus }) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const Icon = PHOTO_STATUS_ICON[status];
  const label = { pending: s.photoStatusPending, approved: s.photoStatusApproved, rejected: s.photoStatusRejected }[status];

  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold", PHOTO_STATUS_CLASS[status])}>
      <Icon size={13} />
      {label}
    </span>
  );
}
