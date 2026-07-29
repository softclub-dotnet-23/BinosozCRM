import { Bell } from "lucide-react";
import { EmptyState } from "../../ui/EmptyState";
import { NOTIFICATION_ICON, NOTIFICATION_TONE_CLASS } from "../workerIcons";
import { useLanguage } from "../../../context/LanguageContext";
import { formatRelativeDayLabel, formatTimeOnly } from "../../../utils/date";
import { cn } from "../../../utils/cn";
import type { WorkerNotification } from "../../../types";

interface NotificationListProps {
  items: WorkerNotification[];
  todayIso: string;
  onOpen: (n: WorkerNotification) => void;
  onResetFilters: () => void;
}

export function NotificationList({ items, todayIso, onOpen, onResetFilters }: NotificationListProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const priorityLabel: Record<WorkerNotification["priority"], string> = {
    important: s.notificationPriorityImportant,
    normal: s.notificationPriorityNormal,
    system: s.notificationPrioritySystem,
  };
  const dotClass: Record<WorkerNotification["priority"], string> = {
    important: "bg-primary",
    normal: "bg-blue",
    system: "bg-ink-muted",
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title={s.emptyNotificationsFiltered}
        description={s.emptyNotificationsFilteredDescription}
        action={
          <button type="button" onClick={onResetFilters} className="text-sm font-semibold text-primary hover:underline">
            {s.materialsResetFilters}
          </button>
        }
      />
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {items.map((n, i) => {
          const Icon = NOTIFICATION_ICON[n.type];
          const isFirstImportantUnread = i === 0 && !n.read && n.priority === "important";
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onOpen(n)}
              aria-label={`${n.title}${!n.read ? ` — ${s.notificationUnreadLabel}` : ""}`}
              className={cn(
                "grid w-full grid-cols-[56px_minmax(0,1fr)_90px_12px] items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-surface-2 sm:px-5",
                isFirstImportantUnread && "bg-primary-soft/40",
              )}
            >
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", n.read ? "bg-surface-3 text-ink-muted" : NOTIFICATION_TONE_CLASS[n.type])}>
                <Icon size={19} />
              </span>

              <span className="min-w-0">
                <span className={cn("block text-sm leading-tight text-ink", !n.read ? "font-bold" : "font-semibold")}>{n.title}</span>
                <span className="mt-1 block text-xs leading-snug text-ink-secondary">{n.description}</span>
                {n.priority === "important" && (
                  <span className="mt-2 inline-flex rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">{priorityLabel.important}</span>
                )}
              </span>

              <span className="shrink-0 text-right text-xs text-ink-muted">
                <span className="block">{formatRelativeDayLabel(n.date, todayIso, s.photoCommentsToday, s.photoCommentsYesterday)}</span>
                <span className="mt-0.5 block tabular">{formatTimeOnly(n.date)}</span>
              </span>

              <span className="flex justify-end pt-1.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : dotClass[n.priority])} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
      <p className="py-4 text-center text-xs text-ink-muted">{s.notificationsResultsSummary(items.length)}</p>
    </div>
  );
}
