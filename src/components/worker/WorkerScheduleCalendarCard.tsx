import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
import type { CalendarDayType } from "../../utils/workerAttendanceAnalytics";

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

const DOT_CLASS: Record<Exclude<CalendarDayType, "off">, string> = {
  workday: "bg-primary",
  overtime: "bg-green",
  briefing: "bg-blue",
};

interface WorkerScheduleCalendarCardProps {
  title: string;
  anchorDate: string;
  dayType: (iso: string) => CalendarDayType;
}

/** Same month-grid mechanics as WorkerCalendarCard (Tasks page), but rendered as a real bordered
 * table-like grid (this page's own reference look — visible cell lines, fixed-height rows) instead
 * of the Tasks page's borderless floating-dates style, and each in-month day can carry one of three
 * real, typed dots (workday/overtime/briefing) instead of a single generic due-date marker — kept
 * as its own component rather than overloading the Tasks page's calendar with a prop it doesn't need. */
export function WorkerScheduleCalendarCard({ title, anchorDate, dayType }: WorkerScheduleCalendarCardProps) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  const ws = strings.worker;
  const [cursor, setCursor] = useState(() => parseISO(anchorDate));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const today = parseISO(anchorDate);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid h-[52px] grid-cols-[1fr_auto_1fr] items-center px-4">
        <h2 className="truncate text-left text-[15px] font-bold text-ink">{title}</h2>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={s.prevMonthAriaLabel}
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[112px] text-center text-sm font-bold capitalize text-ink">{monthYearLabel(s, cursor)}</span>
          <button
            type="button"
            aria-label={s.nextMonthAriaLabel}
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <span aria-hidden="true" />
      </div>

      <div className="grid grid-cols-7 border-t border-b border-border-strong">
        {weekdayLabels(s).map((label) => (
          <span key={label} className="flex h-9 items-center justify-center text-xs font-semibold text-ink-secondary">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-border-strong">
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const type = inMonth ? dayType(iso) : "off";

          return (
            <div key={iso} className="flex h-[50px] flex-col items-center border-b border-r border-border-strong pt-2">
              {isToday ? (
                <span className="flex h-[34px] w-[42px] items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-[0_4px_10px_rgba(255,90,0,0.18)]">
                  {format(day, "d")}
                </span>
              ) : (
                <span className={cn("text-[13px] font-semibold leading-none", inMonth ? "text-ink" : "text-ink-muted/60")}>{format(day, "d")}</span>
              )}
              {type !== "off" && <span className={cn("mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full", DOT_CLASS[type])} />}
            </div>
          );
        })}
      </div>

      <div className="flex h-[42px] flex-wrap items-center gap-x-5 gap-y-1.5 px-3.5 text-xs text-ink-secondary">
        <LegendItem colorClass="bg-primary" label={ws.legendWorkday} />
        <LegendItem colorClass="bg-surface-4" label={ws.legendDayOff} />
        <LegendItem colorClass="bg-green" label={ws.legendOvertime} />
        <LegendItem colorClass="bg-blue" label={ws.legendBriefing} />
      </div>
    </Card>
  );
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", colorClass)} />
      {label}
    </span>
  );
}
