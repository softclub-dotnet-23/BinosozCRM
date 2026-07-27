import { Card } from "../ui/Card";
import { useLanguage } from "../../context/LanguageContext";
import { workSectionLabel } from "../../utils/workStatus";
import type { CriticalWork, Work } from "../../types";

interface CriticalWorksCardProps {
  items: CriticalWork[];
  onOpen?: (work: Work) => void;
  onSeeAll?: () => void;
}

export function CriticalWorksCard({ items, onOpen, onSeeAll }: CriticalWorksCardProps) {
  const { strings } = useLanguage();
  const s = strings.works;
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">{s.criticalTitle}</h2>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {items.map(({ work, overdueDays }) => (
            <li key={work.id}>
              <button
                type="button"
                onClick={() => onOpen?.(work)}
                className="flex w-full items-start gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-surface-1"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{work.title}</p>
                  <p className="truncate text-xs text-ink-secondary">
                    {work.objectName} • {workSectionLabel(s, work.sectionId)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-red">{s.statusOverdue}</p>
                  <p className="text-xs text-ink-muted">{s.overdueDaysLabel(overdueDays)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 py-4 text-center text-sm text-ink-secondary">{s.criticalNone}</p>
      )}
      <button
        type="button"
        onClick={onSeeAll}
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
      >
        {s.allCriticalLink}
      </button>
    </Card>
  );
}
