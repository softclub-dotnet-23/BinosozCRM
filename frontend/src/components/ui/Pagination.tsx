import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { CustomSelect } from "./CustomSelect";
import { useLanguage } from "../../context/LanguageContext";

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
}

function getPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, 2, 3, total, current - 1, current, current + 1]);
  const filtered = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of filtered) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  itemLabel,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const { strings } = useLanguage();
  const c = strings.common;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pageList = getPageList(page, pageCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <p className="text-xs text-ink-secondary">
        {c.paginationShown(from, to, total, itemLabel ?? "")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-ink-secondary">
          <span>{c.showPerPage}</span>
          <CustomSelect
            size="sm"
            aria-label={c.showPerPage}
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
            options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={c.prevPage}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          {pageList.map((p, i) =>
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
                  p === page
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border-strong text-ink-secondary hover:bg-surface-3",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label={c.nextPage}
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
