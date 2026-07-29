import { useState } from "react";
import { Card } from "../../ui/Card";
import { ProgressBar } from "../../ui/ProgressBar";
import { useLanguage } from "../../../context/LanguageContext";
import { formatNumber } from "../../../utils/format";
import { getCategoryVisual } from "./materialVisuals";
import type { CategoryStockRow } from "../../../utils/workerMaterialsAnalytics";

const COLLAPSED_LIMIT = 5;

export function WorkerCategoryStockCard({ rows }: { rows: CategoryStockRow[] }) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const [expanded, setExpanded] = useState(false);

  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_LIMIT);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">{s.categoryStockTitle}</h2>
        {rows.length > COLLAPSED_LIMIT && (
          <button type="button" onClick={() => setExpanded((e) => !e)} className="text-xs font-semibold text-primary hover:underline">
            {expanded ? s.categoryStockCollapseAction : s.materialsAllCategories}
          </button>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {visibleRows.map((row) => {
          const visual = getCategoryVisual(row.category);
          return (
            <div key={row.category}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${visual.dotClass}`} />
                <span className="min-w-0 flex-1 truncate text-xs text-ink-secondary">{row.category}</span>
                <span className="shrink-0 text-xs font-semibold tabular text-ink">
                  {formatNumber(Math.round(row.quantity))} {s.materialsUnitsSuffix}
                </span>
              </div>
              <ProgressBar value={row.percentOfMax} tone={visual.progressTone} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
