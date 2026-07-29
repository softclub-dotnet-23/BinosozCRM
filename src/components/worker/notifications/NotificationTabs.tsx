import { useLanguage } from "../../../context/LanguageContext";
import { cn } from "../../../utils/cn";
import type { NotificationTab } from "../../../utils/workerNotificationsAnalytics";

interface NotificationTabsProps {
  active: NotificationTab;
  onChange: (tab: NotificationTab) => void;
  counts: { all: number; unread: number; important: number; system: number };
}

export function NotificationTabs({ active, onChange, counts }: NotificationTabsProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const tabs: { key: NotificationTab; label: string; count: number | null }[] = [
    { key: "all", label: s.notificationTabAll, count: counts.all },
    { key: "unread", label: s.notificationTabUnread, count: counts.unread },
    { key: "important", label: s.notificationTabImportant, count: null },
    { key: "system", label: s.notificationTabSystem, count: null },
  ];

  return (
    <div className="flex items-center gap-6 border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onClick={() => onChange(tab.key)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-0.5 pb-3 text-sm font-semibold transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular",
                  isActive ? "bg-primary-soft text-primary" : "bg-surface-4 text-ink-secondary",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
