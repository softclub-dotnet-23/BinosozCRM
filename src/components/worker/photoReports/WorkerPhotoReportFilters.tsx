import { Calendar, Upload } from "lucide-react";
import { CustomSelect } from "../../ui/CustomSelect";
import { Button } from "../../ui/Button";
import { useLanguage } from "../../../context/LanguageContext";
import { formatDateShort } from "../../../utils/date";
import { cn } from "../../../utils/cn";
import type { Work } from "../../../types";
import type { PhotoReportFilters } from "../../../utils/workerPhotoReportsAnalytics";

interface WorkerPhotoReportFiltersProps {
  value: PhotoReportFilters;
  onChange: (value: PhotoReportFilters) => void;
  works: Work[];
  dateRange: { from: string; to: string } | null;
  onUploadClick: () => void;
}

export function WorkerPhotoReportFilters({ value, onChange, works, dateRange, onUploadClick }: WorkerPhotoReportFiltersProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const statusPills: { key: PhotoReportFilters["status"]; label: string }[] = [
    { key: "all", label: s.photoFilterAll },
    { key: "today", label: s.photoFilterToday },
    { key: "pending", label: s.photoStatusPending },
    { key: "approved", label: s.photoStatusApproved },
    { key: "rejected", label: s.photoStatusRejected },
  ];

  const workOptions = [{ value: "", label: s.photoFilterAllWorks }, ...works.map((w) => ({ value: w.id, label: w.title }))];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {statusPills.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange({ ...value, status: p.key })}
            className={cn(
              "h-9 shrink-0 rounded-lg border px-3 text-xs font-semibold transition-colors",
              value.status === p.key ? "border-primary bg-card text-primary shadow-[0_0_0_1px_var(--color-primary)]" : "border-border bg-surface-1 text-ink-secondary hover:bg-surface-2",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <CustomSelect className="w-40" size="sm" value={value.workId} onValueChange={(v) => onChange({ ...value, workId: v })} options={workOptions} placeholder={s.photoFilterAllWorks} aria-label={s.photoModalTask} />
        {dateRange && (
          <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 text-xs text-ink-secondary">
            <Calendar size={13} />
            {formatDateShort(dateRange.from)} – {formatDateShort(dateRange.to)}
          </span>
        )}
        <Button size="sm" onClick={onUploadClick}>
          <Upload size={14} />
          {s.photoUploadButton}
        </Button>
      </div>
    </div>
  );
}
