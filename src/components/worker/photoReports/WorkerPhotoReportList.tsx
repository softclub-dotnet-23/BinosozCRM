import { useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Eye, ImageOff } from "lucide-react";
import { EmptyState } from "../../ui/EmptyState";
import { PhotoReportStatusBadge } from "./PhotoReportStatusBadge";
import { useLanguage } from "../../../context/LanguageContext";
import { formatDateTimeShort } from "../../../utils/date";
import { getPageList } from "../../../utils/pagination";
import { cn } from "../../../utils/cn";
import type { PhotoReport } from "../../../types";

const PAGE_SIZE = 6;

interface WorkerPhotoReportListProps {
  reports: PhotoReport[];
  page: number;
  onPageChange: (page: number) => void;
  onOpenReport: (report: PhotoReport) => void;
  onResetFilters: () => void;
  onUploadClick: () => void;
}

export function WorkerPhotoReportList({ reports, page, onPageChange, onOpenReport, onResetFilters, onUploadClick }: WorkerPhotoReportListProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const pageCount = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(() => reports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [reports, safePage]);

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title={s.emptyPhotoReportsFiltered}
        description={s.emptyPhotoReportsFilteredDescription}
        action={
          <div className="flex items-center gap-3">
            <button type="button" onClick={onResetFilters} className="text-sm font-semibold text-primary hover:underline">
              {s.materialsResetFilters}
            </button>
            <button type="button" onClick={onUploadClick} className="text-sm font-semibold text-primary hover:underline">
              {s.photoUploadButton}
            </button>
          </div>
        }
      />
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {pageRows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:flex-nowrap">
            <button type="button" onClick={() => onOpenReport(r)} className="flex shrink-0 items-center gap-1">
              {r.images.slice(0, 3).map((src, i) => {
                const isLastVisible = i === 2 && r.images.length > 3;
                return (
                  <span key={i} className="relative h-[50px] w-[62px] shrink-0 overflow-hidden rounded-md border border-border">
                    <img src={src} alt="" className={cn("h-full w-full object-cover", isLastVisible && "brightness-50")} />
                    {isLastVisible && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">+{r.images.length - 3}</span>}
                  </span>
                );
              })}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{r.workTitle}</p>
              <p className="truncate text-xs text-ink-muted">
                {r.objectName} / {r.sectionName}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
                <Calendar size={11} />
                {formatDateTimeShort(r.createdDate)}
              </p>
              {r.comment && <p className="mt-0.5 truncate text-xs text-ink-secondary">{r.comment}</p>}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <PhotoReportStatusBadge status={r.status} />
              <button
                type="button"
                onClick={() => onOpenReport(r)}
                aria-label={s.photoViewAction}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <Eye size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3.5">
        <p className="text-xs text-ink-secondary">
          {s.photoResultsSummary((safePage - 1) * PAGE_SIZE + 1, Math.min(reports.length, safePage * PAGE_SIZE), reports.length)}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={s.paginationPrev}
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          {getPageList(safePage, pageCount).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-ink-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors",
                  p === safePage ? "border-primary bg-primary text-white" : "border-border-strong text-ink-secondary hover:bg-surface-3",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label={s.paginationNext}
            disabled={safePage >= pageCount}
            onClick={() => onPageChange(safePage + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
