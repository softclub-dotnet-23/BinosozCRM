import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Image as ImageIcon, ListChecks, MessageSquare } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { photoReportsRepository, photoReportCommentsRepository } from "../../data/repositories";
import { todayIso } from "../../utils/workerAnalytics";
import { WorkerQuickActionTile } from "../../components/worker/WorkerQuickActionTile";
import { WorkerMessageModal } from "../../components/worker/WorkerMessageModal";
import { WorkerPhotoReportStats } from "../../components/worker/photoReports/WorkerPhotoReportStats";
import { WorkerPhotoReportFilters } from "../../components/worker/photoReports/WorkerPhotoReportFilters";
import { WorkerPhotoReportList } from "../../components/worker/photoReports/WorkerPhotoReportList";
import { WorkerPhotoUploadCard } from "../../components/worker/photoReports/WorkerPhotoUploadCard";
import { WorkerPhotoActivityChart } from "../../components/worker/photoReports/WorkerPhotoActivityChart";
import { WorkerPhotoRecentComments } from "../../components/worker/photoReports/WorkerPhotoRecentComments";
import { WorkerPhotoSummaryCard } from "../../components/worker/photoReports/WorkerPhotoSummaryCard";
import { PhotoLightbox } from "../../components/worker/photoReports/PhotoLightbox";
import {
  computePhotoActivityChart,
  computePhotoReportStats,
  computePhotoReportSummary,
  filterPhotoReports,
  type PhotoReportFilters,
} from "../../utils/workerPhotoReportsAnalytics";
import type { PhotoReport } from "../../types";

const UPLOAD_CARD_ID = "photo-upload-card";

export default function WorkerPhotoReportsPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { employee, brigadeWorks, prorab } = useWorkerScope(user);

  const allReports = useRepositorySnapshot(photoReportsRepository);
  const allComments = useRepositorySnapshot(photoReportCommentsRepository);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [lightboxReport, setLightboxReport] = useState<PhotoReport | null>(null);
  const [filters, setFilters] = useState<PhotoReportFilters>({ status: "all", workId: "" });
  const [page, setPage] = useState(1);

  const today = todayIso();

  const myReports = useMemo(
    () => (employee ? allReports.filter((r) => r.employeeId === employee.id).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)) : []),
    [allReports, employee],
  );
  const myComments = useMemo(() => {
    const myReportIds = new Set(myReports.map((r) => r.id));
    return allComments.filter((c) => myReportIds.has(c.photoReportId)).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1));
  }, [allComments, myReports]);

  const filteredReports = useMemo(() => filterPhotoReports(myReports, filters, today), [myReports, filters, today]);
  const stats = useMemo(() => computePhotoReportStats(myReports, today), [myReports, today]);
  const activityPoints = useMemo(() => computePhotoActivityChart(myReports, today), [myReports, today]);
  const summary = useMemo(() => computePhotoReportSummary(brigadeWorks, myReports, stats, today), [brigadeWorks, myReports, stats, today]);

  const dateRange = activityPoints.length > 0 ? { from: activityPoints[0].date, to: activityPoints[activityPoints.length - 1].date } : null;

  function handleFiltersChange(next: PhotoReportFilters) {
    setFilters(next);
    setPage(1);
  }

  function scrollToUpload() {
    document.getElementById(UPLOAD_CARD_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <AppLayout title={s.photoReportsPageTitle} subtitle={s.photoReportsPageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      <div className="space-y-4">
        <WorkerPhotoReportStats stats={stats} />

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="min-w-0 space-y-4">
            <Card className="min-w-0 overflow-hidden p-0">
              <div className="p-4 pb-3">
                <h2 className="mb-3 text-sm font-bold text-ink">{s.photoReportsCardTitle}</h2>
                <WorkerPhotoReportFilters value={filters} onChange={handleFiltersChange} works={brigadeWorks} dateRange={dateRange} onUploadClick={scrollToUpload} />
              </div>
              <WorkerPhotoReportList
                reports={filteredReports}
                page={page}
                onPageChange={setPage}
                onOpenReport={setLightboxReport}
                onResetFilters={() => handleFiltersChange({ status: "all", workId: "" })}
                onUploadClick={scrollToUpload}
              />
            </Card>

            <WorkerPhotoActivityChart points={activityPoints} stats={stats} />
          </div>

          <div className="min-w-0 space-y-4">
            <WorkerPhotoUploadCard id={UPLOAD_CARD_ID} />
            <WorkerPhotoRecentComments comments={myComments} todayIso={today} />

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.photoQuickActionsTitle}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <WorkerQuickActionTile icon={Camera} label={s.photoActionTakePhoto} onClick={scrollToUpload} />
                <WorkerQuickActionTile icon={ImageIcon} label={s.photoActionChooseGallery} onClick={scrollToUpload} />
                <WorkerQuickActionTile icon={ListChecks} label={s.photoActionMyTasks} onClick={() => navigate("/worker/tasks")} />
                <WorkerQuickActionTile
                  icon={MessageSquare}
                  label={s.photoActionContactProrab}
                  onClick={() => (prorab ? setMessageModalOpen(true) : showToast(s.emptyReminders, "info"))}
                />
              </div>
            </Card>

            <WorkerPhotoSummaryCard summary={summary} onGoToTasks={() => navigate("/worker/tasks")} />
          </div>
        </div>
      </div>

      <WorkerMessageModal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} />
      <PhotoLightbox report={lightboxReport} onClose={() => setLightboxReport(null)} />
    </AppLayout>
  );
}
