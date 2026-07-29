import { Briefcase, CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import { WorkerCircleKpiCard } from "../WorkerCircleKpiCard";
import { useLanguage } from "../../../context/LanguageContext";
import type { ProfileKpis as ProfileKpisData } from "../../../utils/workerProfileAnalytics";

export function ProfileKpis({ kpis }: { kpis: ProfileKpisData }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <WorkerCircleKpiCard icon={Briefcase} tone="blue" title={s.profileKpiExperienceTitle} value={s.profileYearsValue(kpis.experienceYears)} footer="" />
      <WorkerCircleKpiCard icon={ClipboardList} tone="orange" title={s.profileKpiTasksTitle} value={String(kpis.activeTasks)} footer={s.profileKpiTasksFooter} />
      <WorkerCircleKpiCard icon={Clock3} tone="purple" title={s.profileKpiHoursTitle} value={`${kpis.workedHoursThisMonth} ч`} footer={s.profileKpiHoursFooter} />
      <WorkerCircleKpiCard icon={CheckCircle2} tone="green" title={s.profileKpiAttendanceTitle} value={`${kpis.attendancePercent}%`} footer={s.profileKpiAttendanceFooter} />
    </div>
  );
}
