import type { ObjectSummaryRow } from "../../types";
import { StatusBadge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { Avatar } from "../ui/Avatar";
import { getProgressTone } from "../../utils/progress";
import { formatCurrency } from "../../utils/format";

export function ObjectStateTable({ rows }: { rows: ObjectSummaryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-ink-secondary">
            <th className="px-5 py-2.5 font-medium sm:px-6">Объект</th>
            <th className="px-3 py-2.5 font-medium">Прораб</th>
            <th className="px-3 py-2.5 font-medium">Прогресс</th>
            <th className="px-3 py-2.5 font-medium">Бюджет</th>
            <th className="px-3 py-2.5 pr-5 font-medium sm:pr-6">Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-[#FAFAF9]">
              <td className="px-5 py-4 font-semibold text-ink sm:px-6">{row.name}</td>
              <td className="px-3 py-4 text-ink-secondary">
                <div className="flex items-center gap-2">
                  <Avatar name={row.foreman} size="sm" />
                  <span className="whitespace-nowrap">{row.foreman}</span>
                </div>
              </td>
              <td className="px-3 py-4">
                <div className="flex items-center gap-2.5">
                  <ProgressBar value={row.progress} tone={getProgressTone(row.status, row.progress)} className="w-20" />
                  <span className="text-xs font-semibold text-ink">{row.progress}%</span>
                </div>
              </td>
              <td className="px-3 py-4 text-ink tabular">{formatCurrency(row.budget).replace(" сомони", " с.")}</td>
              <td className="px-3 py-4 pr-5 sm:pr-6">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
