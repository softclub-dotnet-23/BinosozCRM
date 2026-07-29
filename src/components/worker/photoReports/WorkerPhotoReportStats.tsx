import { Camera, CheckCircle2, Clock3, Image } from "lucide-react";
import { WorkerCircleKpiCard } from "../WorkerCircleKpiCard";
import { useLanguage } from "../../../context/LanguageContext";
import type { PhotoReportStats } from "../../../utils/workerPhotoReportsAnalytics";

export function WorkerPhotoReportStats({ stats }: { stats: PhotoReportStats }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <WorkerCircleKpiCard icon={Camera} tone="orange" title={s.photoKpiUploadedTitle} value={String(stats.total)} footer={s.photoKpiUploadedFooter} />
      <WorkerCircleKpiCard icon={Image} tone="blue" title={s.photoKpiTodayTitle} value={String(stats.today)} footer={s.photoKpiTodayFooter} />
      <WorkerCircleKpiCard icon={Clock3} tone="orange" title={s.photoKpiPendingTitle} value={String(stats.pending)} footer={s.photoKpiPendingFooter} />
      <WorkerCircleKpiCard icon={CheckCircle2} tone="green" title={s.photoKpiApprovedTitle} value={String(stats.approved)} footer={s.photoKpiApprovedFooter} />
    </div>
  );
}
