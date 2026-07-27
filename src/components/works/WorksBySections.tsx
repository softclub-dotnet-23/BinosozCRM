import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { useLanguage } from "../../context/LanguageContext";
import { workSectionLabel } from "../../utils/workStatus";
import type { WorkSectionBreakdown } from "../../types";

function sectionTone(progress: number): "green" | "orange" | "red" {
  if (progress >= 70) return "green";
  if (progress >= 30) return "orange";
  return "red";
}

export function WorksBySections({ data }: { data: WorkSectionBreakdown[] }) {
  const { strings } = useLanguage();
  const s = strings.works;
  return (
    <Card className="flex min-w-0 flex-col p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">{s.bySectionsTitle}</h2>
      <div className="mt-4 flex-1 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-secondary">
              <th className="pb-2.5 font-medium">{s.colSection}</th>
              <th className="pb-2.5 pl-3 font-medium">{strings.common.progressLabel}</th>
              <th className="pb-2.5 pl-3 text-right font-medium">{s.colWorksCount}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.section.id} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-3 text-ink">{workSectionLabel(s, row.section.id)}</td>
                <td className="py-2.5 pl-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={row.averageProgress} tone={sectionTone(row.averageProgress)} className="w-24" />
                    <span className="shrink-0 text-xs font-semibold text-ink">{row.averageProgress}%</span>
                  </div>
                </td>
                <td className="py-2.5 pl-3 text-right tabular text-ink-secondary">{row.workCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
