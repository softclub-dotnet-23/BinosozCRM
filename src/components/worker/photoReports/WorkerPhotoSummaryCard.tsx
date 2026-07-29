import { AlertTriangle, CalendarClock, ChevronRight, Image as ImageIcon, ListChecks } from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { useLanguage } from "../../../context/LanguageContext";
import { formatDateShort } from "../../../utils/date";
import type { PhotoReportSummary } from "../../../utils/workerPhotoReportsAnalytics";

function SummaryRow({ icon: Icon, label, value }: { icon: typeof ListChecks; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon size={15} className="shrink-0 text-ink-muted" />
      <span className="min-w-0 flex-1 truncate text-sm text-ink-secondary">{label}</span>
      <span className="shrink-0 text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

export function WorkerPhotoSummaryCard({ summary, onGoToTasks }: { summary: PhotoReportSummary; onGoToTasks: () => void }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.photoSummaryTitle}</h2>
      <div className="mt-2 divide-y divide-border">
        <SummaryRow icon={ListChecks} label={s.photoSummaryTotalTasks} value={String(summary.totalTasks)} />
        <SummaryRow icon={ImageIcon} label={s.photoSummaryPendingPhotos} value={String(summary.pendingPhotos)} />
        <SummaryRow icon={CalendarClock} label={s.photoSummaryNextCheck} value={summary.nextCheckDate ? formatDateShort(summary.nextCheckDate) : "—"} />
        <SummaryRow icon={AlertTriangle} label={s.photoSummaryRemarks} value={String(summary.remarks)} />
      </div>
      <Button variant="outline" className="mt-3 w-full" onClick={onGoToTasks}>
        {s.photoSummaryGoToTasks}
        <ChevronRight size={15} />
      </Button>
    </Card>
  );
}
