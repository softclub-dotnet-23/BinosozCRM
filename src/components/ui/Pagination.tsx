import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  itemLabel = "объектов",
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2 text-xs text-ink-secondary">
        <span>Показать по:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-border-strong px-2 py-1 text-xs text-ink focus:border-primary focus:outline-none"
        >
          {[6, 10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-ink-secondary">
        {from}–{to} из {total} {itemLabel}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Предыдущая страница"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
              p === page ? "bg-primary text-white" : "border border-border-strong text-ink-secondary hover:bg-[#F5F5F4]",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          aria-label="Следующая страница"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
