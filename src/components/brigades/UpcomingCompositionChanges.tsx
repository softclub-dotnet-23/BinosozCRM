import { Calendar } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/StatusBadge";
import { Avatar } from "../ui/Avatar";
import { formatDateShort } from "../../utils/date";
import type { CompositionChange } from "../../types";

const CHANGE_TYPE_CONFIG: Record<CompositionChange["changeType"], { label: string; tone: "orange" | "green" | "blue" }> = {
  transfer: { label: "Перевод", tone: "blue" },
  assignment: { label: "Назначение", tone: "green" },
  replacement: { label: "Замена", tone: "orange" },
};

export function UpcomingCompositionChanges({
  changes,
  onSeeAll,
}: {
  changes: CompositionChange[];
  onSeeAll?: () => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Ближайшие изменения состава</h2>
      <ul className="mt-3 space-y-3">
        {changes.map((change) => {
          const config = CHANGE_TYPE_CONFIG[change.changeType];
          return (
            <li key={change.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-soft text-blue">
                <Calendar size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-secondary">{formatDateShort(change.date)}</p>
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                  <Avatar name={change.employeeName} size="sm" className="h-5 w-5 text-[9px]" />
                  {change.employeeName}
                </div>
                <p className="truncate text-xs text-ink-secondary">
                  {change.fromBrigadeName} → {change.toBrigadeName}
                </p>
                <div className="mt-1">
                  <Badge tone={config.tone}>{config.label}</Badge>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onSeeAll}
        className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
      >
        Все изменения состава →
      </button>
    </Card>
  );
}
