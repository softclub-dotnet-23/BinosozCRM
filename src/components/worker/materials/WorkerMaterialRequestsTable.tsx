import { Package } from "lucide-react";
import { Card } from "../../ui/Card";
import { EmptyState } from "../../ui/EmptyState";
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

/** Shared by the Materials page's "Мои заявки" (active statuses) and "История" (terminal
 * statuses) tabs — the caller decides which requests to pass in, this just renders them. */
export function WorkerMaterialRequestsTable({ requests, emptyLabel }: { requests: MaterialRequest[]; emptyLabel: string }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const statusLabel: Record<MaterialRequestStatus, string> = {
    new: s.materialStatusNew,
    approved: s.materialStatusApproved,
    in_transit: s.materialStatusInTransit,
    issued: s.materialStatusIssued,
    rejected: s.materialStatusRejected,
  };

  return (
    <Card className="overflow-hidden p-0">
      {requests.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-secondary">
                <th className="px-5 py-3 font-medium">{s.materialsColMaterial}</th>
                <th className="px-3 py-3 text-right font-medium">{s.materialsColQty}</th>
                <th className="px-3 py-3 font-medium">{s.materialsColDate}</th>
                <th className="px-5 py-3 text-right font-medium">{s.materialsColStatus}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-ink">{r.materialName}</td>
                  <td className="px-3 py-3 text-right tabular text-ink-secondary">
                    {r.quantity} {r.unit}
                  </td>
                  <td className="px-3 py-3 text-ink-secondary">{formatDateShort(r.date)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CLASS[r.status])}>{statusLabel[r.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Package} title={emptyLabel} />
      )}
    </Card>
  );
}
