import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { MaterialThumbnail } from "../../materials/MaterialThumbnail";
import { EmptyState } from "../../ui/EmptyState";
import { useLanguage } from "../../../context/LanguageContext";
import { formatNumber } from "../../../utils/format";
import { cn } from "../../../utils/cn";
import { getCategoryVisual } from "./materialVisuals";
import type { WorkerMaterialRow } from "../../../utils/workerMaterialsAnalytics";
import { getPageList } from "../../../utils/pagination";

const PAGE_SIZE = 8;

interface WorkerMaterialsTableProps {
  rows: WorkerMaterialRow[];
  page: number;
  onPageChange: (page: number) => void;
  selectedMaterialId: string | null;
  onSelectMaterial: (row: WorkerMaterialRow) => void;
  onResetFilters: () => void;
}

export function WorkerMaterialsTable({ rows, page, onPageChange, selectedMaterialId, onSelectMaterial, onResetFilters }: WorkerMaterialsTableProps) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(() => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [rows, safePage]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={s.emptyMaterialsSearch}
        description={s.emptyMaterialsSearchDescription}
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-secondary">
              <th className="px-5 py-2.5 font-medium">{s.materialsColMaterial}</th>
              <th className="px-3 py-2.5 font-medium">{s.materialsColCategory}</th>
              <th className="px-3 py-2.5 font-medium">{s.materialsColUnit}</th>
              <th className="px-3 py-2.5 text-right font-medium">{s.materialsColInStock}</th>
              <th className="px-3 py-2.5 text-right font-medium">{s.materialsColReserved}</th>
              <th className="px-3 py-2.5 text-right font-medium">{s.materialsColAvailable}</th>
              <th className="px-3 py-2.5 font-medium">{s.materialsColPrice}</th>
              <th className="w-8 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const visual = getCategoryVisual(row.category);
              const unitLabel = row.unitDetail ? `${row.unit} (${row.unitDetail})` : row.unit;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectMaterial(row)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === "Enter" && onSelectMaterial(row)}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2",
                    selectedMaterialId === row.id && "bg-primary-soft/60",
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <MaterialThumbnail src={row.imageUrl} alt={row.name} className="h-9 w-9 shrink-0 border border-border" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{row.name}</p>
                        <p className="truncate text-xs text-ink-muted">{row.supplier}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", visual.badgeClass)}>{row.category}</span>
                  </td>
                  <td className="px-3 py-3 text-ink-secondary">{unitLabel}</td>
                  <td className="px-3 py-3 text-right tabular text-ink">{formatNumber(row.stock)}</td>
                  <td className="px-3 py-3 text-right tabular text-ink-secondary">{formatNumber(row.reserved)}</td>
                  <td className={cn("px-3 py-3 text-right tabular font-semibold", row.available > 0 ? "text-green" : "text-ink-muted")}>
                    {formatNumber(row.available)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold tabular text-ink">{formatNumber(row.price)} {s.materialsCurrencySuffix}</p>
                    <p className="text-xs text-ink-muted">/ {row.unit}</p>
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
        <p className="text-xs text-ink-secondary">
          {s.materialsResultsSummary((safePage - 1) * PAGE_SIZE + 1, Math.min(rows.length, safePage * PAGE_SIZE), rows.length)}
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
