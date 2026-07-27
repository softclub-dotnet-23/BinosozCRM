import { Card } from "../ui/Card";
import { completenessColor, completenessPercent } from "../../utils/brigadeAnalytics";
import type { Brigade } from "../../types";

const LEGEND = [
  { range: "90–100%", label: "Отличная укомплектованность", color: "#16803C" },
  { range: "70–89%", label: "Хорошая укомплектованность", color: "#22A447" },
  { range: "50–69%", label: "Средняя укомплектованность", color: "#F58A1F" },
  { range: "<50%", label: "Низкая укомплектованность", color: "#E83939" },
];

export function BrigadeCompletenessChart({ brigades }: { brigades: Brigade[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Укомплектованность бригад</h2>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
        <div>
          <ul className="space-y-3">
            {brigades.map((b) => {
              const percent = completenessPercent(b);
              return (
                <li key={b.id} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-sm text-ink-secondary" title={b.name}>
                    {b.name.replace("Бригада ", "")}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0F0EE]">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${percent}%`, backgroundColor: completenessColor(percent) }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold text-ink tabular">{percent}%</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between pl-[92px] pr-10 text-[11px] text-ink-muted">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">{item.range}</p>
                <p className="text-xs text-ink-secondary">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
