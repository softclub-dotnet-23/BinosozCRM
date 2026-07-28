import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
import type { Work } from "../../types";

function weekdayLabels(s: AppStrings["brigades"]): string[] {
  return [s.weekdayMon, s.weekdayTue, s.weekdayWed, s.weekdayThu, s.weekdayFri, s.weekdaySat, s.weekdaySun];
}

const MONTH_KEYS = [
  "monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun",
  "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec",
] as const;

function monthYearLabel(s: AppStrings["brigades"], date: Date): string {
  const label = s[MONTH_KEYS[date.getMonth()]];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${date.getFullYear()}`;
}

interface WorkerCalendarCardProps {
  works: Work[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

/** Same month-grid pattern as the existing AssignmentCalendar (components/assignments), scoped
 * to this worker's real task due dates (Work.plannedEnd) instead of assignment intervals — reuses
 * the same generic weekday/month i18n keys (strings.brigades) rather than inventing new ones. */
export function WorkerCalendarCard({ works, selectedDate, onSelectDate }: WorkerCalendarCardProps) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  const [cursor, setCursor] = useState(() => parseISO(selectedDate));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const dueDates = useMemo(() => new Set(works.map((w) => w.plannedEnd)), [works]);
  const today = new Date();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold capitalize text-ink">{monthYearLabel(s, cursor)}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={s.prevMonthAriaLabel}
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label={s.nextMonthAriaLabel}
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {weekdayLabels(s).map((label) => (
          <span key={label} className="text-[11px] font-semibold text-ink-muted">
            {label}
          </span>
        ))}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate === iso;
          const hasDue = dueDates.has(iso);

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                !inMonth && "text-ink-muted/50",
                inMonth && !isSelected && "text-ink hover:bg-surface-3",
                isSelected && "bg-primary text-white",
                !isSelected && isToday && "ring-1 ring-primary font-bold text-primary",
              )}
            >
              {format(day, "d")}
              {hasDue && !isSelected && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
