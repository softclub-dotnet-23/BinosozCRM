import { useMemo, useState } from "react";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flag,
  LogIn,
  Percent,
  PlayCircle,
  StopCircle,
  Umbrella,
  Utensils,
  Zap,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { useChartAnimation } from "../../hooks/useChartAnimation";
import { attendanceRepository, notificationsRepository } from "../../data/repositories";
import { WorkerCircleKpiCard, WorkerCircleStat } from "../../components/worker/WorkerCircleKpiCard";
import { WorkerScheduleCalendarCard } from "../../components/worker/WorkerScheduleCalendarCard";
import { WorkerMessageModal } from "../../components/worker/WorkerMessageModal";
import { NOTIFICATION_ICON, NOTIFICATION_TONE_CLASS } from "../../components/worker/workerIcons";
import {
  addDaysIso,
  computeAttendanceSummary,
  computeCalendarDayType,
  computeHoursChart,
  computeScheduleUpcomingEvents,
  computeTodayTimeline,
  computeWeekSchedule,
  isSunday,
} from "../../utils/workerAttendanceAnalytics";
import { todayIso } from "../../utils/workerAnalytics";
import { formatDateShort } from "../../utils/date";
import { cn } from "../../utils/cn";

const STATUS_BADGE_CLASS = {
  full: "bg-green-soft text-green",
  short: "bg-warning-soft text-warning",
  off: "bg-surface-3 text-ink-secondary",
} as const;

const EVENT_ICON = { briefing: CalendarDays, dayoff: Calendar, deadline: Flag } as const;
const EVENT_TONE_CLASS = {
  briefing: "bg-blue-soft text-blue",
  dayoff: "bg-purple-soft text-purple",
  deadline: "bg-red-soft text-red",
} as const;

function currentMonthRange(today: string): [string, string] {
  const [y, m] = today.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return [from, to];
}

export default function WorkerSchedulePage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee, object, prorab, brigadeWorks } = useWorkerScope(user);
  const attendance = useRepositorySnapshot(attendanceRepository);
  const chartAnim = useChartAnimation(900);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const today = todayIso();
  const [monthFrom, monthTo] = useMemo(() => currentMonthRange(today), [today]);

  const monthSummary = useMemo(
    () => (employee ? computeAttendanceSummary(attendance, employee.id, monthFrom, monthTo) : null),
    [attendance, employee, monthFrom, monthTo],
  );

  const todayRecord = useMemo(() => attendance.find((r) => r.employeeId === employee?.id && r.date === today) ?? null, [attendance, employee, today]);
  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);
  const timeline = useMemo(() => computeTodayTimeline(todayRecord, nowMinutes), [todayRecord, nowMinutes]);
  const timelineIcon = { arrival: PlayCircle, lunch_start: Utensils, lunch_end: LogIn, departure: StopCircle } as const;
  const timelineLabel = { arrival: "Начало смены", lunch_start: "Обед", lunch_end: "Возвращение", departure: "Конец смены" } as const;
  const timelineTone = {
    arrival: "bg-green-soft text-green",
    lunch_start: "bg-warning-soft text-warning",
    lunch_end: "bg-blue-soft text-blue",
    departure: "bg-red-soft text-red",
  } as const;

  const nextDayOff = useMemo(() => {
    let cursor = addDaysIso(today, 1);
    let days = 1;
    for (let i = 0; i < 7; i += 1) {
      if (isSunday(cursor)) return { date: cursor, days };
      cursor = addDaysIso(cursor, 1);
      days += 1;
    }
    return { date: cursor, days };
  }, [today]);

  const dayType = useMemo(() => (iso: string) => computeCalendarDayType(attendance, employee?.id ?? "", brigadeWorks, iso), [attendance, employee, brigadeWorks]);

  const weekStart = useMemo(() => addDaysIso(today, -6), [today]);
  const weekSchedule = useMemo(
    () => (employee ? computeWeekSchedule(attendance, employee.id, weekStart, object?.name ?? null) : []),
    [attendance, employee, weekStart, object],
  );

  const hoursChart = useMemo(() => (employee ? computeHoursChart(attendance, employee.id, weekStart) : []), [attendance, employee, weekStart]);
  const weeklyHoursSummary = useMemo(() => {
    const planTotal = hoursChart.reduce((sum, p) => sum + p.planHours, 0);
    const factTotal = hoursChart.reduce((sum, p) => sum + p.factHours, 0);
    const overtimeTotal = Math.max(0, Math.round((factTotal - planTotal) * 10) / 10);
    const absences = hoursChart.filter((p) => p.planHours > 0 && p.factHours === 0).length;
    return { planTotal: Math.round(planTotal), factTotal: Math.round(factTotal), overtimeTotal, absences };
  }, [hoursChart]);

  const upcomingEvents = useMemo(() => computeScheduleUpcomingEvents(brigadeWorks, today), [brigadeWorks, today]);
  const notifications = useRepositorySnapshot(notificationsRepository);
  const myReminders = useMemo(
    () => (user ? notifications.filter((n) => n.userId === user.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3) : []),
    [notifications, user],
  );

  const statusLabel = { full: s.statusFullShift, short: s.statusShortShift, off: s.statusDayOff } as const;

  return (
    <AppLayout title={s.schedulePageTitle} subtitle={s.schedulePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <WorkerCircleKpiCard icon={CalendarCheck} tone="orange" title={s.kpiWorkdaysTitle} value={String(monthSummary ? monthSummary.presentDays + monthSummary.lateDays : 0)} footer={s.kpiWorkdaysFooter} />
          <WorkerCircleKpiCard
            icon={Clock3}
            tone="blue"
            title={s.kpiTodayShiftTitle}
            value={todayRecord?.arrivalTime && todayRecord?.departureTime ? `${todayRecord.arrivalTime} – ${todayRecord.departureTime}` : "—"}
            footer={s.kpiTodayShiftFooter}
          />
          <WorkerCircleKpiCard icon={Umbrella} tone="blue" title={s.kpiNextDayOffTitle} value={formatDateShort(nextDayOff.date)} footer={s.kpiNextDayOffFooter(nextDayOff.days)} />
          <WorkerCircleKpiCard icon={Clock3} tone="purple" title={s.kpiWorkedHoursTitle} value={`${Math.round((monthSummary?.totalWorkedMinutes ?? 0) / 60)} ч`} footer={s.kpiWorkedHoursFooter} />
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(300px,360px)]">
          <div className="min-w-0 space-y-4">
            <WorkerScheduleCalendarCard title={s.calendarShiftsTitle} anchorDate={today} dayType={dayType} />

            <Card className="min-w-0 overflow-hidden p-0">
              <h2 className="p-4 pb-0 text-sm font-bold text-ink">{s.weekScheduleTitle}</h2>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-t border-border text-left text-xs text-ink-secondary">
                      <th className="px-4 py-2 font-medium">{s.weekScheduleColDay}</th>
                      <th className="px-3 py-2 font-medium">{s.weekScheduleColDate}</th>
                      <th className="px-3 py-2 font-medium">{s.weekScheduleColTime}</th>
                      <th className="px-3 py-2 font-medium">{s.weekScheduleColStatus}</th>
                      <th className="px-4 py-2 font-medium">{s.weekScheduleColObject}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekSchedule.map((row) => (
                      <tr key={row.date} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-ink">{row.weekdayLabel}</td>
                        <td className={cn("px-3 py-2.5 tabular", row.date === today ? "font-semibold text-primary" : "text-ink-secondary")}>{row.dateLabel}</td>
                        <td className="px-3 py-2.5 tabular text-ink-secondary">{row.timeRange ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_BADGE_CLASS[row.statusKind])}>{statusLabel[row.statusKind]}</span>
                        </td>
                        <td className="px-4 py-2.5 text-ink-secondary">{row.objectName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="min-w-0 p-4">
              <h2 className="text-sm font-bold text-ink">{s.hoursWorkedTitle}</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                <div className="h-[224px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hoursChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                      <CartesianGrid stroke="#E9EDF3" strokeDasharray="0" vertical={false} />
                      <XAxis dataKey="weekdayLabel" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 12]} ticks={[0, 4, 8, 12]} tickFormatter={(v: number) => `${v} ч`} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                        contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 12, boxShadow: "var(--shadow-popover)" }}
                        formatter={(value, name) => [`${value} ч`, name === "planHours" ? s.planHoursLabel : s.factLabel]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={26}
                        formatter={(value: string) => (value === "planHours" ? s.planHoursLabel : s.factLabel)}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="planHours" name="planHours" fill="#1E293B" radius={[4, 4, 0, 0]} maxBarSize={20} {...chartAnim} />
                      <Bar dataKey="factHours" name="factHours" fill="#F58A1F" radius={[4, 4, 0, 0]} maxBarSize={20} {...chartAnim} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-row gap-2 md:flex-col">
                  <WorkerCircleStat icon={CalendarCheck} tone="blue" label={s.planHoursLabel} value={`${weeklyHoursSummary.planTotal} ч`} />
                  <WorkerCircleStat icon={Clock3} tone="orange" label={s.factLabel} value={`${weeklyHoursSummary.factTotal} ч`} />
                  <WorkerCircleStat icon={Zap} tone="green" label={s.overtimeHoursLabel} value={`${weeklyHoursSummary.overtimeTotal} ч`} />
                  <WorkerCircleStat icon={Calendar} tone="red" label={s.absencesLabel} value={String(weeklyHoursSummary.absences)} />
                </div>
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            <Card className="min-w-0 p-4">
              <h2 className="text-sm font-bold text-ink">{s.scheduleTitle(formatDateShort(today))}</h2>
              {timeline.length > 0 ? (
                <div className="relative mt-3.5 space-y-3.5">
                  {timeline.map((event, i) => {
                    const Icon = timelineIcon[event.kind];
                    return (
                      <div key={event.id} className="relative flex items-start gap-3">
                        {i < timeline.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%+2px)] w-px bg-border" aria-hidden="true" />}
                        <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", timelineTone[event.kind])}>
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-xs tabular font-semibold text-ink">{event.time}</p>
                          <p className="text-sm text-ink-secondary">{timelineLabel[event.kind]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-muted">{s.emptyTimeline}</p>
              )}
            </Card>

            <Card className="min-w-0 p-4">
              <h2 className="text-sm font-bold text-ink">{s.upcomingEventsTitle}</h2>
              <div className="mt-1.5 divide-y divide-border">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((ev) => {
                    const Icon = EVENT_ICON[ev.kind];
                    return (
                      <div key={ev.id} className="flex items-center gap-3 py-2">
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", EVENT_TONE_CLASS[ev.kind])}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{ev.title}</p>
                          {ev.subtitle && <p className="text-xs text-ink-secondary">{ev.subtitle}</p>}
                        </div>
                        <span className="shrink-0 text-xs text-ink-muted">{formatDateShort(ev.date)}</span>
                        <ChevronRight size={15} className="shrink-0 text-ink-muted" />
                      </div>
                    );
                  })
                ) : (
                  <p className="py-3 text-xs text-ink-muted">{s.emptyReminders}</p>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.monthSummaryTitle}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <MiniStat icon={CalendarCheck} tone="green" label={s.summaryWorkdays} value={String(monthSummary ? monthSummary.presentDays + monthSummary.lateDays : 0)} />
                <MiniStat icon={Calendar} tone="orange" label={s.summaryDaysOff} value={String(monthSummary ? monthSummary.expectedWorkdays - (monthSummary.presentDays + monthSummary.lateDays) : 0)} />
                <MiniStat icon={Zap} tone="green" label={s.summaryOvertime} value={`${Math.round((monthSummary?.overtimeMinutes ?? 0) / 60)} ч`} />
                <MiniStat icon={Percent} tone="purple" label={s.summaryAvgAttendance} value={`${monthSummary?.attendancePercent ?? 0}%`} />
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.remindersTitle}</h2>
              <div className="mt-1.5 divide-y divide-border">
                {myReminders.length > 0 ? (
                  myReminders.map((n) => {
                    const Icon = NOTIFICATION_ICON[n.type];
                    return (
                      <div key={n.id} className="flex items-center gap-3 py-2">
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", NOTIFICATION_TONE_CLASS[n.type])}>
                          <Icon size={14} />
                        </span>
                        <p className="min-w-0 flex-1 truncate text-sm text-ink">{n.title}</p>
                        <ChevronRight size={15} className="shrink-0 text-ink-muted" />
                      </div>
                    );
                  })
                ) : (
                  <p className="py-3 text-xs text-ink-muted">{s.emptyReminders}</p>
                )}
              </div>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  if (prorab) setMessageModalOpen(true);
                  else showToast(s.emptyReminders, "info");
                }}
              >
                {s.contactProrabButton}
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <WorkerMessageModal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} />
    </AppLayout>
  );
}

function MiniStat({ icon: Icon, tone, label, value }: { icon: typeof Clock3; tone: "green" | "orange" | "purple"; label: string; value: string }) {
  const toneClass = { green: "text-green", orange: "text-warning", purple: "text-purple" }[tone];
  return (
    <div className="rounded-xl bg-surface-1 p-3">
      <Icon size={16} className={toneClass} />
      <p className="mt-1.5 text-lg font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-secondary">{label}</p>
    </div>
  );
}
