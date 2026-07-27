import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
import type { Assignment } from "../../types";

function weekdayLabels(s: AppStrings["brigades"]): string[] {
  return [s.weekdayMon, s.weekdayTue, s.weekdayWed, s.weekdayThu, s.weekdayFri, s.weekdaySat, s.weekdaySun];
}

const MONTH_KEYS = [
  "monthJan", "monthFeb", "monthMar", "monthApr", "monthMay", "monthJun",
  "monthJul", "monthAug", "monthSep", "monthOct", "monthNov", "monthDec",
] as const;

function monthYearLabel(s: AppStrings["brigades"], date: Date): string {
  return `${s[MONTH_KEYS[date.getMonth()]]} ${date.getFullYear()}`;
}

interface AssignmentCalendarProps {
  assignments: Assignment[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export function AssignmentCalendar({ assignments, selectedDate, onSelectDate }: AssignmentCalendarProps) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  const [cursor, setCursor] = useState(() => (selectedDate ? parseISO(selectedDate) : new Date(2026, 6, 1)));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const assignmentIntervals = useMemo(
    () => assignments.map((a) => ({ start: parseISO(a.periodStart), end: parseISO(a.periodEnd) })),
    [assignments],
  );

  function hasAssignment(day: Date): boolean {
    return assignmentIntervals.some((interval) => isWithinInterval(day, interval));
  }

  const today = new Date();

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{s.calendarTitle}</h2>
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
      <p className="mt-1 text-sm font-semibold capitalize text-ink-secondary">{monthYearLabel(s, cursor)}</p>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {weekdayLabels(s).map((label) => (
          <span key={label} className="text-xs font-semibold text-ink-muted">
            {label}
          </span>
        ))}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate === iso;
          const marked = hasAssignment(day);

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : iso)}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                !inMonth && "text-ink-muted/50",
                inMonth && !isSelected && "text-ink hover:bg-surface-3",
                isSelected && "bg-primary text-white",
                !isSelected && isToday && "ring-1 ring-primary text-primary font-bold",
              )}
            >
              {format(day, "d")}
              {marked && !isSelected && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          className="mt-3 text-xs font-semibold text-primary hover:text-primary-hover"
        >
          {s.clearDateSelection}
        </button>
      )}
    </Card>
  );
}
