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
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";
import type { Assignment } from "../../types";

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface AssignmentCalendarProps {
  assignments: Assignment[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export function AssignmentCalendar({ assignments, selectedDate, onSelectDate }: AssignmentCalendarProps) {
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
        <h2 className="text-[17px] font-bold text-ink">Календарь назначений</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="Следующий месяц"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold capitalize text-ink-secondary">{format(cursor, "LLLL yyyy", { locale: ru })}</p>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-[11px] font-semibold text-ink-muted">
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
                inMonth && !isSelected && "text-ink hover:bg-[#F5F5F4]",
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
          Сбросить выбор даты ×
        </button>
      )}
    </Card>
  );
}
