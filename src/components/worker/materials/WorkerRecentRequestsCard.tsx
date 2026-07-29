import { Package } from "lucide-react";
import { Card } from "../../ui/Card";
import { useLanguage } from "../../../context/LanguageContext";
import { formatDateShort } from "../../../utils/date";
import { cn } from "../../../utils/cn";
import type { MaterialRequest, MaterialRequestStatus } from "../../../types";

const STATUS_CLASS: Record<MaterialRequestStatus, string> = {
  new: "bg-blue-soft text-blue",
  approved: "bg-green-soft text-green",
  in_transit: "bg-warning-soft text-warning",
  issued: "bg-purple-soft text-purple",
  rejected: "bg-red-soft text-red",
};

interface WorkerRecentRequestsCardProps {
  requests: MaterialRequest[];
  onViewAll: () => void;
}

export function WorkerRecentRequestsCard({ requests, onViewAll }: WorkerRecentRequestsCardProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const statusLabel: Record<MaterialRequestStatus, string> = {
    new: s.materialStatusNew,
    approved: s.materialStatusApproved,
    in_transit: s.materialStatusInTransit,
    issued: s.materialStatusIssued,
    rejected: s.materialStatusRejected,
  };

  const recent = requests.slice(0, 3);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">{s.recentRequestsTitle}</h2>
        {requests.length > 0 && (
          <button type="button" onClick={onViewAll} className="text-xs font-semibold text-primary hover:underline">
            {s.recentRequestsAllAction}
          </button>
        )}
      </div>
      {recent.length > 0 ? (
        <div className="mt-1.5 divide-y divide-border">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", STATUS_CLASS[r.status])}>
                <Package size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {r.materialName}, {r.quantity} {r.unit}
                </p>
                <p className="text-xs text-ink-secondary">{formatDateShort(r.date)}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CLASS[r.status])}>{statusLabel[r.status]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-3 text-xs text-ink-muted">{s.emptyMaterialRequests}</p>
      )}
    </Card>
  );
}
