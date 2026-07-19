import { Calendar } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/StatusBadge";
import type { UpcomingBrigadeAssignment } from "../../data/mockUpcomingBrigadeAssignments";

export function UpcomingBrigadeAssignmentsCard({
  items,
  onSeeAll,
}: {
  items: UpcomingBrigadeAssignment[];
  onSeeAll?: () => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Ближайшие назначения</h2>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-soft text-blue">
              <Calendar size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-secondary">{item.dateLabel}</p>
              <p className="truncate text-sm font-semibold text-ink">{item.brigadeName}</p>
              <p className="truncate text-xs text-ink-secondary">{item.objectName}</p>
              <div className="mt-1">
                <Badge tone="blue">{item.specializationBadge}</Badge>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSeeAll}
        className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
      >
        Все назначения →
      </button>
    </Card>
  );
}
