import { AlertCircle, Mail, Settings2 } from "lucide-react";
import { Card } from "../../ui/Card";
import { cn } from "../../../utils/cn";
import { useLanguage } from "../../../context/LanguageContext";
import type { NotificationSummary } from "../../../utils/workerNotificationsAnalytics";

function SummaryRow({ icon: Icon, tone, label, value }: { icon: typeof Mail; tone: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone)}>
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink-secondary">{label}</span>
      <span className="shrink-0 text-base font-bold tabular text-ink">{value}</span>
    </div>
  );
}

export function NotificationSummaryCard({ summary }: { summary: NotificationSummary }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.notificationSummaryTitle}</h2>
      <div className="mt-2 divide-y divide-border">
        <SummaryRow icon={Mail} tone="bg-blue-soft text-blue" label={s.notificationSummaryTotal} value={summary.total} />
        <SummaryRow icon={Mail} tone="bg-primary-soft text-primary" label={s.notificationSummaryUnread} value={summary.unread} />
        <SummaryRow icon={AlertCircle} tone="bg-red-soft text-red" label={s.notificationSummaryImportant} value={summary.important} />
        <SummaryRow icon={Settings2} tone="bg-green-soft text-green" label={s.notificationSummarySystem} value={summary.system} />
      </div>
    </Card>
  );
}
