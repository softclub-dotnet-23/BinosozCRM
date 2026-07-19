import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { formatDateRu } from "../../utils/date";
import type { Assignment } from "../../types";

export function UpcomingAssignments({ assignments }: { assignments: Assignment[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Ближайшие назначения</h2>
      {assignments.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-lg px-1 py-2.5 hover:bg-[#FAFAF9]">
              <Avatar name={a.foremanName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{a.workTitle}</p>
                <p className="truncate text-xs text-ink-secondary">
                  {a.objectName} · {a.brigadeName}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-ink-secondary">{formatDateRu(a.periodStart)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 py-4 text-center text-sm text-ink-secondary">Нет предстоящих назначений</p>
      )}
    </Card>
  );
}
