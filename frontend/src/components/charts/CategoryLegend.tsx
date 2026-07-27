import type { CategorySpend } from "../../types";
import { formatNumber } from "../../utils/format";

interface CategoryLegendProps {
  data: CategorySpend[];
  secondaryOrder?: "amount-first" | "percent-first";
  unitSuffix?: string;
}

export function CategoryLegend({ data, secondaryOrder = "amount-first", unitSuffix = "" }: CategoryLegendProps) {
  const total = data.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <ul className="min-w-0 flex-1 space-y-3">
      {data.map((entry) => {
        const percent = total > 0 ? Math.round((entry.amount / total) * 100) : 0;
        const amountText = `${formatNumber(entry.amount)}${unitSuffix}`;
        const secondary =
          secondaryOrder === "amount-first" ? `${amountText} (${percent}%)` : `${percent}% — ${amountText}`;
        return (
          <li key={entry.category} className="flex items-start gap-2.5 text-sm">
            <span className="mt-1.25 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <div className="min-w-0 leading-snug">
              <p className="break-words text-ink">{entry.category}</p>
              <p className="mt-0.5 whitespace-nowrap text-xs font-semibold text-ink-secondary tabular">{secondary}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
