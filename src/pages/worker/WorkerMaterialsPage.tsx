import { useMemo, useState } from "react";
import { Package, PackagePlus } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { materialRequestsRepository } from "../../data/repositories";
import { useWorkerScope } from "../../utils/workerAccess";
import { WorkerMaterialModal } from "../../components/worker/WorkerMaterialModal";
import { formatDateShort } from "../../utils/date";
import { cn } from "../../utils/cn";
import type { MaterialRequestStatus } from "../../types";

const STATUS_CLASS: Record<MaterialRequestStatus, string> = {
  new: "bg-blue-soft text-blue",
  approved: "bg-green-soft text-green",
  in_transit: "bg-warning-soft text-warning",
  issued: "bg-purple-soft text-purple",
  rejected: "bg-red-soft text-red",
};

export default function WorkerMaterialsPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { brigade } = useWorkerScope(user);
  const requests = useRepositorySnapshot(materialRequestsRepository);
  const [modalOpen, setModalOpen] = useState(false);

  const statusLabel: Record<MaterialRequestStatus, string> = {
    new: s.materialStatusNew,
    approved: s.materialStatusApproved,
    in_transit: s.materialStatusInTransit,
    issued: s.materialStatusIssued,
    rejected: s.materialStatusRejected,
  };

  const myRequests = useMemo(
    () => (brigade ? requests.filter((r) => r.brigadeName === brigade.name).sort((a, b) => (a.date < b.date ? 1 : -1)) : []),
    [requests, brigade],
  );

  return (
    <AppLayout
      title={s.materialsPageTitle}
      subtitle={s.materialsPageSubtitle}
      titleBelowHeader
      contentMaxWidth="1600px"
      action={
        <Button onClick={() => setModalOpen(true)}>
          <PackagePlus size={16} /> {s.materialsRequestButton}
        </Button>
      }
    >
      <Card className="overflow-hidden p-0">
        {myRequests.length > 0 ? (
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
                {myRequests.map((r) => (
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
          <EmptyState icon={Package} title={s.emptyMaterialRequests} />
        )}
      </Card>

      <WorkerMaterialModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppLayout>
  );
}
