import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PhotoReportStatusBadge } from "./PhotoReportStatusBadge";
import { useLanguage } from "../../../context/LanguageContext";
import { formatDateTimeShort } from "../../../utils/date";
import { cn } from "../../../utils/cn";
import type { PhotoReport } from "../../../types";

interface PhotoLightboxProps {
  report: PhotoReport | null;
  onClose: () => void;
}

/** Full report detail + image lightbox in one: opened both by clicking a row's thumbnails and by
 * its "eye" view action, so there's one real detail surface instead of two overlapping modals. */
export function PhotoLightbox({ report, onClose }: PhotoLightboxProps) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [report?.id]);

  useEffect(() => {
    if (!report) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + report!.images.length) % report!.images.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % report!.images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [report, onClose]);

  if (!report) return null;
  const hasMultiple = report.images.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-popover)]">
        <button
          type="button"
          onClick={onClose}
          aria-label={strings.common.cancelLabel}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <X size={18} />
        </button>

        <div className="relative flex items-center justify-center bg-ink" style={{ minHeight: 320 }}>
          <img src={report.images[index]} alt={report.workTitle} className="max-h-[52vh] w-full object-contain" />
          {hasMultiple && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={() => setIndex((i) => (i - 1 + report.images.length) % report.images.length)}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={() => setIndex((i) => (i + 1) % report.images.length)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight size={18} />
              </button>
              <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
                {index + 1} / {report.images.length}
              </span>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className="flex gap-2 overflow-x-auto border-b border-border p-2.5">
            {report.images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={cn("h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2", i === index ? "border-primary" : "border-transparent")}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-ink">{report.workTitle}</h3>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {report.objectName} / {report.sectionName}
              </p>
            </div>
            <PhotoReportStatusBadge status={report.status} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">{formatDateTimeShort(report.createdDate)}</p>
          {report.comment && <p className="mt-3 text-sm text-ink">{report.comment}</p>}
          {report.reviewerComment && (
            <div className="mt-3 rounded-xl bg-surface-1 p-3">
              <p className="text-xs font-semibold text-ink-secondary">{s.photoReviewerCommentLabel}</p>
              <p className="mt-1 text-sm text-ink">{report.reviewerComment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
