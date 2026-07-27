import { Calendar } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/StatusBadge";
import { Avatar } from "../ui/Avatar";
import { formatDateShort } from "../../utils/date";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
import type { CompositionChange } from "../../types";

const CHANGE_TYPE_TONE: Record<CompositionChange["changeType"], "orange" | "green" | "blue"> = {
  transfer: "blue",
  assignment: "green",
  replacement: "orange",
};

function changeTypeLabel(s: AppStrings["brigades"], type: CompositionChange["changeType"]): string {
  const map: Record<CompositionChange["changeType"], string> = {
    transfer: s.changeTypeTransfer,
    assignment: s.changeTypeAssignment,
    replacement: s.changeTypeReplacement,
  };
  return map[type];
}

export function UpcomingCompositionChanges({
  changes,
  onSeeAll,
}: {
  changes: CompositionChange[];
  onSeeAll?: () => void;
}) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">{s.upcomingChangesTitle}</h2>
      <ul className="mt-3 space-y-3">
        {changes.map((change) => {
          const tone = CHANGE_TYPE_TONE[change.changeType];
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
                  <Badge tone={tone}>{changeTypeLabel(s, change.changeType)}</Badge>
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
        {s.allChangesLink}
      </button>
    </Card>
  );
}
