import { Camera, CheckCircle2, ClipboardCheck, Package } from "lucide-react";
import { Card } from "../../ui/Card";
import { useLanguage } from "../../../context/LanguageContext";
import { formatRelativeDay } from "../../../utils/date";
import { cn } from "../../../utils/cn";
import type { ProfileActivityItem, ProfileActivityType } from "../../../utils/workerProfileAnalytics";

const ACTIVITY_ICON: Record<ProfileActivityType, typeof Camera> = {
  attendance: CheckCircle2,
  photoReport: Camera,
  materialRequest: Package,
  taskCompleted: ClipboardCheck,
};
const ACTIVITY_TONE_CLASS: Record<ProfileActivityType, string> = {
  attendance: "bg-green-soft text-green",
  photoReport: "bg-blue-soft text-blue",
  materialRequest: "bg-warning-soft text-warning",
  taskCompleted: "bg-purple-soft text-purple",
};

export function RecentActivityCard({ items, todayIso }: { items: ProfileActivityItem[]; todayIso: string }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const titleByKey: Record<string, string> = {
    attendanceMarked: s.profileActivityAttendance,
    photoReportUploaded: s.profileActivityPhoto,
    materialsRequested: s.profileActivityMaterials,
    taskCompleted: s.profileActivityTask,
  };

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.profileActivityTitle}</h2>
      {items.length > 0 ? (
        <div className="mt-1 divide-y divide-border">
          {items.map((item) => {
            const Icon = ACTIVITY_ICON[item.type];
            return (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", ACTIVITY_TONE_CLASS[item.type])}>
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{titleByKey[item.title]}</span>
                <span className="shrink-0 text-xs text-ink-muted">{formatRelativeDay(item.createdAt, todayIso, s.photoCommentsToday, s.photoCommentsYesterday)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-3 text-xs text-ink-muted">{s.emptyReminders}</p>
      )}
    </Card>
  );
}
