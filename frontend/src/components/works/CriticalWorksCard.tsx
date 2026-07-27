import { Card } from "../ui/Card";
import type { CriticalWork, Work } from "../../types";

function formatOverdueDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} дней`;
  if (mod10 === 1) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

interface CriticalWorksCardProps {
  items: CriticalWork[];
  onOpen?: (work: Work) => void;
  onSeeAll?: () => void;
}

export function CriticalWorksCard({ items, onOpen, onSeeAll }: CriticalWorksCardProps) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Критические работы</h2>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {items.map(({ work, overdueDays }) => (
            <li key={work.id}>
              <button
                type="button"
                onClick={() => onOpen?.(work)}
                className="flex w-full items-start gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-[#FAFAF9]"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{work.title}</p>
                  <p className="truncate text-xs text-ink-secondary">
                    {work.objectName} • {work.sectionName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-red">Просрочено</p>
                  <p className="text-xs text-ink-muted">{formatOverdueDays(overdueDays)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 py-4 text-center text-sm text-ink-secondary">Критических работ нет</p>
      )}
      <button
        type="button"
        onClick={onSeeAll}
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
      >
        Все критические работы →
      </button>
    </Card>
  );
}
