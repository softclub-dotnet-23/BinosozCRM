import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { activityTone } from "../../utils/brigadeAnalytics";
import type { BrigadeActivityRow } from "../../utils/brigadeAnalytics";

export function BrigadeActivityCard({ rows }: { rows: BrigadeActivityRow[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Активность бригад</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3">
            <span className="w-[72px] shrink-0 truncate text-sm text-ink-secondary" title={row.name}>
              {row.name.replace("Бригада ", "")}
            </span>
            <ProgressBar value={row.efficiency} tone={activityTone(row.efficiency)} className="flex-1" />
            <span className="w-9 shrink-0 text-right text-xs font-semibold text-ink tabular">{row.efficiency}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
