import { useMemo, useState } from "react";
import { Camera } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { photoReportsRepository } from "../../data/repositories";
import { useWorkerScope } from "../../utils/workerAccess";
import { WorkerPhotoReportModal } from "../../components/worker/WorkerPhotoReportModal";
import { formatDateTimeShort } from "../../utils/date";

export default function WorkerPhotoReportsPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { employee } = useWorkerScope(user);
  const reports = useRepositorySnapshot(photoReportsRepository);
  const [modalOpen, setModalOpen] = useState(false);

  const myReports = useMemo(
    () => (employee ? reports.filter((r) => r.employeeId === employee.id).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)) : []),
    [reports, employee],
  );

  return (
    <AppLayout
      title={s.photoReportsPageTitle}
      subtitle={s.photoReportsPageSubtitle}
      titleBelowHeader
      contentMaxWidth="1600px"
      action={
        <Button onClick={() => setModalOpen(true)}>
          <Camera size={16} /> {s.photoReportsNewButton}
        </Button>
      }
    >
      {myReports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myReports.map((r) => (
            <Card key={r.id} className="overflow-hidden p-0">
              <img src={r.imageUrl} alt={r.workTitle} className="h-40 w-full object-cover" />
              <div className="p-4">
                <p className="text-sm font-semibold text-ink">{r.workTitle}</p>
                <p className="mt-0.5 text-xs text-ink-secondary">{r.objectName}</p>
                {r.comment && <p className="mt-2 text-xs text-ink-secondary">{r.comment}</p>}
                <p className="mt-2 text-[11px] text-ink-muted">{formatDateTimeShort(r.createdDate)}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState icon={Camera} title={s.emptyPhotoReports} />
        </Card>
      )}

      <WorkerPhotoReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppLayout>
  );
}
