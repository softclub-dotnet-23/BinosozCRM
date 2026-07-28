import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useWorkerScope } from "../../utils/workerAccess";
import { computeWorkerSchedule, todayIso } from "../../utils/workerAnalytics";
import { formatDateShort, formatWeekdayShort } from "../../utils/date";
import { cn } from "../../utils/cn";

// UTC-anchored date-only arithmetic — parsing/mutating in local time and reading back via
// toISOString() (always UTC) can silently shift the result by a day depending on the runtime's
// UTC offset (the same class of bug fixed earlier in mockWorks.ts/reportsAnalytics.ts).
function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export default function WorkerSchedulePage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { brigadeWorks } = useWorkerScope(user);
  const [weekStart, setWeekStart] = useState(() => {
    const [y, m, d] = todayIso().split("-").map(Number);
    const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return addDaysIso(todayIso(), mondayOffset);
  });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)), [weekStart]);
  const today = todayIso();

  return (
    <AppLayout title={s.schedulePageTitle} subtitle={s.schedulePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDaysIso(w, -7))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong text-ink-secondary hover:bg-surface-2"
          aria-label="Previous week"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-ink">
          {formatDateShort(days[0])} – {formatDateShort(days[6])}
        </p>
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDaysIso(w, 7))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong text-ink-secondary hover:bg-surface-2"
          aria-label="Next week"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const items = computeWorkerSchedule(brigadeWorks, day);
          return (
            <Card key={day} className={cn("p-3", day === today && "border-primary")}>
              <p className={cn("text-xs font-semibold uppercase", day === today ? "text-primary" : "text-ink-secondary")}>{formatWeekdayShort(day)}</p>
              <p className="text-sm font-bold text-ink">{formatDateShort(day)}</p>
              <div className="mt-2 space-y-2">
                {items.filter((i) => i.kind === "work").length > 0 ? (
                  items
                    .filter((i) => i.kind === "work")
                    .map((item) => (
                      <div key={item.id} className="rounded-lg bg-surface-2 px-2 py-1.5">
                        <p className="text-[11px] font-semibold tabular text-ink-secondary">{item.time}</p>
                        <p className="truncate text-xs font-medium text-ink">{item.title}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-[11px] text-ink-muted">{s.emptySchedule}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {brigadeWorks.length === 0 && <EmptyState title={s.emptySchedule} />}
    </AppLayout>
  );
}
