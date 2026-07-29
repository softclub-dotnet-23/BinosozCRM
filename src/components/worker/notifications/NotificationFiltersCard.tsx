import { Calendar, RotateCcw } from "lucide-react";
import { Card } from "../../ui/Card";
import { CustomSelect } from "../../ui/CustomSelect";
import { useLanguage } from "../../../context/LanguageContext";
import { DEFAULT_NOTIFICATION_FILTERS, type NotificationFilters } from "../../../utils/workerNotificationsAnalytics";
import type { WorkerNotificationType } from "../../../types";

interface NotificationFiltersCardProps {
  value: NotificationFilters;
  onChange: (value: NotificationFilters) => void;
  availableTypes: WorkerNotificationType[];
}

export function NotificationFiltersCard({ value, onChange, availableTypes }: NotificationFiltersCardProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const typeLabel: Record<WorkerNotificationType, string> = {
    task_assigned: s.notificationTypeTask,
    task_completed: s.notificationTypeTask,
    task_review: s.notificationTypeTask,
    materials_delivered: s.notificationTypeMaterials,
    schedule_change: s.notificationTypeSchedule,
    photo_report_approved: s.notificationTypePhotoReport,
    photo_report_rejected: s.notificationTypePhotoReport,
    reminder: s.notificationTypeReminder,
    problem_update: s.notificationTypeSystem,
    system: s.notificationTypeSystem,
  };

  const typeOptions = [
    { value: "all", label: s.notificationAllTypes },
    ...Array.from(new Set(availableTypes.map((t) => typeLabel[t]))).map((label) => ({ value: label, label })),
  ];

  const priorityOptions = [
    { value: "all", label: s.notificationAllPriorities },
    { value: "important", label: s.notificationPriorityImportant },
    { value: "normal", label: s.notificationPriorityNormal },
    { value: "system", label: s.notificationPrioritySystem },
  ];

  function handleTypeChange(label: string) {
    if (label === "all") {
      onChange({ ...value, type: "all" });
      return;
    }
    const matched = availableTypes.find((t) => typeLabel[t] === label);
    onChange({ ...value, type: matched ?? "all" });
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.notificationFiltersTitle}</h2>
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="notif-filter-type" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.notificationFilterTypeLabel}
          </label>
          <CustomSelect
            id="notif-filter-type"
            value={value.type === "all" ? "all" : typeLabel[value.type]}
            onValueChange={handleTypeChange}
            options={typeOptions}
          />
        </div>

        <div>
          <label htmlFor="notif-filter-date" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.notificationFilterDateLabel}
          </label>
          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              id="notif-filter-date"
              type="date"
              value={value.date ?? ""}
              onChange={(e) => onChange({ ...value, date: e.target.value || null })}
              className="h-10 w-full rounded-[10px] border border-border-strong bg-card pl-8 pr-3 text-sm text-ink"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notif-filter-priority" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.notificationFilterPriorityLabel}
          </label>
          <CustomSelect id="notif-filter-priority" value={value.priority} onValueChange={(v) => onChange({ ...value, priority: v as NotificationFilters["priority"] })} options={priorityOptions} />
        </div>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_NOTIFICATION_FILTERS)}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border-strong bg-card text-sm text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <RotateCcw size={14} />
          {s.notificationResetFilters}
        </button>
      </div>
    </Card>
  );
}
