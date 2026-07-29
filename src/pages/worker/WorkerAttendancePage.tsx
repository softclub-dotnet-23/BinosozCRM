import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  LogIn,
  Sun,
  UserCheck,
  UserRoundX,
  Utensils,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { attendanceRepository, notificationsRepository } from "../../data/repositories";
import { WorkerAttendanceTooltip } from "../../components/worker/WorkerAttendanceTooltip";
import { WorkerCircleKpiCard, WorkerCircleStat } from "../../components/worker/WorkerCircleKpiCard";
import { WorkerMessageModal } from "../../components/worker/WorkerMessageModal";
import { NOTIFICATION_ICON, NOTIFICATION_TONE_CLASS } from "../../components/worker/workerIcons";
import {
  addDaysIso,
  buildAttendanceRows,
  computeAttendanceSummary,
  computeTodayTimeline,
  computeWeeklyChart,
  formatDurationMinutes,
  isSunday,
  type AttendanceDisplayStatus,
} from "../../utils/workerAttendanceAnalytics";
import { todayIso } from "../../utils/workerAnalytics";
import { formatDateShort, formatWeekdayShort } from "../../utils/date";
import { cn } from "../../utils/cn";

type AttendanceTab = "all" | "present" | "late" | "absent";
type PeriodPreset = "month" | "last7" | "last30";

const STATUS_BADGE_CLASS: Record<AttendanceDisplayStatus, string> = {
  present: "bg-green-soft text-green",
  late: "bg-warning-soft text-warning",
  absent: "bg-red-soft text-red",
  day_off: "bg-surface-3 text-ink-secondary",
  no_data: "bg-surface-3 text-ink-muted",
};

const CHART_BAR_COLOR: Record<AttendanceDisplayStatus, string> = {
  present: "#22A447",
  late: "#F58A1F",
  absent: "#E83939",
  day_off: "#C4C4C1",
  no_data: "#E9EDF3",
};

function currentMonthRange(today: string): [string, string] {
  const [y, m] = today.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return [from, to];
}

function timeToMinutesLocal(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function WorkerAttendancePage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee, object, prorab, brigadeWorks } = useWorkerScope(user);
  const attendance = useRepositorySnapshot(attendanceRepository);
  const notifications = useRepositorySnapshot(notificationsRepository);
  const reduceMotion = usePrefersReducedMotion();

  const today = todayIso();
  const [period, setPeriod] = useState<PeriodPreset>("month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [tab, setTab] = useState<AttendanceTab>("all");
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const [dateFrom, dateTo] = useMemo(() => {
    if (period === "last7") return [addDaysIso(today, -6), today];
    if (period === "last30") return [addDaysIso(today, -29), today];
    return currentMonthRange(today);
  }, [period, today]);

  const periodLabel =
    period === "last7" ? s.lastSevenDays : period === "last30" ? s.lastThirtyDays : `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`;

  const summary = useMemo(
    () => (employee ? computeAttendanceSummary(attendance, employee.id, dateFrom, dateTo) : null),
    [attendance, employee, dateFrom, dateTo],
  );

  const rows = useMemo(
    () => (employee ? buildAttendanceRows(attendance, employee.id, dateFrom, dateTo) : []),
    [attendance, employee, dateFrom, dateTo],
  );

  const filteredRows = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.displayStatus === tab);
  }, [rows, tab]);

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      present: rows.filter((r) => r.displayStatus === "present").length,
      late: rows.filter((r) => r.displayStatus === "late").length,
      absent: rows.filter((r) => r.displayStatus === "absent").length,
    }),
    [rows],
  );

  // Trailing 7-day window ending today, rather than a calendar Mon–Sun week — the latter can run
  // past the seed data's real coverage window when "today" falls near the end of it, leaving
  // future days with no real record to chart.
  const weekStart = useMemo(() => addDaysIso(today, -6), [today]);

  const weeklyChart = useMemo(
    () => (employee ? computeWeeklyChart(attendance, employee.id, weekStart) : []),
    [attendance, employee, weekStart],
  );

  const weeklyStats = useMemo(() => {
    const weekEnd = addDaysIso(weekStart, 6);
    if (!employee) return null;
    return computeAttendanceSummary(attendance, employee.id, weekStart, weekEnd);
  }, [attendance, employee, weekStart]);

  const todayRecord = useMemo(() => attendance.find((r) => r.employeeId === employee?.id && r.date === today) ?? null, [attendance, employee, today]);
  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);
  const timeline = useMemo(() => computeTodayTimeline(todayRecord, nowMinutes), [todayRecord, nowMinutes]);

  const dailyLateMinutes = todayRecord?.status === "late" && todayRecord.arrivalTime ? Math.max(0, timeToMinutesLocal(todayRecord.arrivalTime) - 8 * 60) : 0;
  const dailyWorkedMinutes = todayRecord?.arrivalTime && todayRecord?.departureTime ? Math.max(0, timeToMinutesLocal(todayRecord.departureTime) - timeToMinutesLocal(todayRecord.arrivalTime)) : 0;
  const dailyOvertimeMinutes = Math.max(0, dailyWorkedMinutes - (17 * 60 + 15 - 8 * 60));
  const dailyAttendancePercent = todayRecord?.status === "present" ? 100 : todayRecord?.status === "late" ? Math.max(40, 100 - dailyLateMinutes) : 0;

  const myReminders = useMemo(
    () => (user ? notifications.filter((n) => n.userId === user.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3) : []),
    [notifications, user],
  );

  const nextWorkday = useMemo(() => {
    let cursor = addDaysIso(today, 1);
    for (let i = 0; i < 7; i += 1) {
      if (!isSunday(cursor)) return cursor;
      cursor = addDaysIso(cursor, 1);
    }
    return cursor;
  }, [today]);

  const activeTasksCount = useMemo(() => brigadeWorks.filter((w) => w.status === "in_progress" || w.status === "planned" || w.status === "on_review").length, [brigadeWorks]);

  const statusLabel: Record<AttendanceDisplayStatus, string> = {
    present: s.attendanceStatusPresent,
    late: s.attendanceStatusLate,
    absent: s.attendanceStatusAbsent,
    day_off: s.statusDayOff,
    no_data: s.statusNoData,
  };

  const timelineIcon = { arrival: Sun, lunch_start: Utensils, lunch_end: LogIn, departure: BriefcaseBusiness } as const;
  const timelineLabel = {
    arrival: s.todayTimelineArrival,
    lunch_start: s.todayTimelineLunchStart,
    lunch_end: s.todayTimelineLunchEnd,
    departure: s.todayTimelineDeparture,
  } as const;

  if (!employee) {
    return (
      <AppLayout title={s.attendancePageTitle} subtitle={s.attendancePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
        <EmptyState title={s.emptyAttendance} />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={s.attendancePageTitle} subtitle={s.attendancePageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <WorkerCircleKpiCard icon={CircleCheckBig} tone="blue" title={s.kpiAttendanceTotalTitle} value={String(summary?.totalRecords ?? 0)} footer={s.kpiAttendanceTotalFooter} />
          <WorkerCircleKpiCard icon={UserCheck} tone="green" title={s.kpiPresentTitle} value={String(summary?.presentDays ?? 0)} footer={s.kpiPresentFooter} />
          <WorkerCircleKpiCard icon={Clock3} tone="orange" title={s.kpiLateTitle} value={String(summary?.lateDays ?? 0)} footer={s.kpiLateFooter} />
          <WorkerCircleKpiCard icon={UserRoundX} tone="red" title={s.kpiAbsentTitle} value={String(summary?.absentDays ?? 0)} footer={s.kpiAbsentFooter} />
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-4">
            <Card className="min-w-0 overflow-visible p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <h2 className="text-sm font-bold text-ink">{s.attendanceHistoryTitle}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", `${s.attendanceTabAll} (${tabCounts.all})`],
                        ["present", `${s.attendanceTabPresent} (${tabCounts.present})`],
                        ["late", `${s.attendanceTabLate} (${tabCounts.late})`],
                        ["absent", `${s.attendanceTabAbsent} (${tabCounts.absent})`],
                      ] as [AttendanceTab, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          tab === key ? "bg-primary text-white" : "bg-surface-2 text-ink-secondary hover:bg-surface-3",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPeriodOpen((v) => !v)}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs font-medium text-ink hover:bg-surface-2"
                    >
                      <CalendarDays size={14} className="text-ink-secondary" />
                      {periodLabel}
                    </button>
                    {periodOpen && (
                      <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]">
                        {(
                          [
                            ["month", s.thisMonth],
                            ["last7", s.lastSevenDays],
                            ["last30", s.lastThirtyDays],
                          ] as [PeriodPreset, string][]
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setPeriod(key);
                              setPeriodOpen(false);
                            }}
                            className={cn(
                              "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2",
                              period === key ? "font-semibold text-primary" : "text-ink",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {filteredRows.length > 0 ? (
                <>
                  <div className="hidden min-w-0 overflow-x-auto sm:block">
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-t border-border text-left text-xs text-ink-secondary">
                          <th className="px-4 py-2.5 font-medium">{s.attendanceColDate}</th>
                          <th className="px-3 py-2.5 font-medium">{s.attendanceColObject}</th>
                          <th className="px-3 py-2.5 font-medium">{s.attendanceColArrival}</th>
                          <th className="px-3 py-2.5 font-medium">{s.attendanceColDeparture}</th>
                          <th className="px-3 py-2.5 font-medium">{s.attendanceColStatus}</th>
                          <th className="px-4 py-2.5 font-medium">{s.attendanceColNote}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr key={row.date} className="border-b border-border last:border-0">
                            <td className={cn("px-4 py-3", row.displayStatus === "day_off" || row.displayStatus === "no_data" ? "text-ink-secondary" : "text-ink")}>
                              {formatDateShort(row.date)}, {formatWeekdayShort(row.date)}
                            </td>
                            <td className="px-3 py-3 text-ink-secondary">{row.record?.objectName ?? object?.name ?? "—"}</td>
                            <td className="px-3 py-3 tabular text-ink-secondary">{row.record?.arrivalTime ?? "—"}</td>
                            <td className="px-3 py-3 tabular text-ink-secondary">{row.record?.departureTime ?? "—"}</td>
                            <td className="px-3 py-3">
                              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_BADGE_CLASS[row.displayStatus])}>
                                {statusLabel[row.displayStatus]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-ink-secondary">{row.record?.note || (row.displayStatus === "day_off" ? s.noteDayOff : "—")}</td>
                            {/* no_data intentionally falls through to "—": the status badge already reads "Нет данных" */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-border sm:hidden">
                    {filteredRows.map((row) => (
                      <div key={row.date} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {formatDateShort(row.date)}, {formatWeekdayShort(row.date)}
                          </span>
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_BADGE_CLASS[row.displayStatus])}>
                            {statusLabel[row.displayStatus]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-secondary">{row.record?.objectName ?? object?.name ?? "—"}</p>
                        <p className="mt-1 text-xs tabular text-ink-muted">
                          {row.record?.arrivalTime ?? "—"} – {row.record?.departureTime ?? "—"}
                        </p>
                        {(row.record?.note || row.displayStatus === "day_off") && (
                          <p className="mt-1 text-xs text-ink-muted">{row.record?.note || s.noteDayOff}</p>
                        )}
                        {/* no_data intentionally shows no note line: the status badge already reads "Нет данных" */}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState title={s.emptyAttendance} />
              )}
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink">{s.weeklyAnalyticsTitle}</h2>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                <div className="h-56 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#E9EDF3" strokeDasharray="0" vertical={false} />
                      <XAxis dataKey="date" tick={<WeekdayDateTick points={weeklyChart} />} axisLine={false} tickLine={false} height={38} interval={0} />
                      <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                        content={(props) => (
                          <WorkerAttendanceTooltip
                            {...props}
                            points={weeklyChart}
                            statusLabel={(status) => statusLabel[status]}
                            checkInLabel={s.tooltipCheckIn}
                            checkOutLabel={s.tooltipCheckOut}
                            lateLabel={s.tooltipLate}
                            workedLabel={s.tooltipWorked}
                            statusFieldLabel={s.tooltipStatusLabel}
                          />
                        )}
                      />
                      <Bar dataKey="attendancePercent" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={!reduceMotion} animationDuration={900} animationEasing="ease-out">
                        {weeklyChart.map((point) => (
                          <Cell key={point.date} fill={CHART_BAR_COLOR[point.status]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 md:flex md:flex-col">
                  <WorkerCircleStat icon={CircleCheckBig} tone="blue" label={s.normLabel} value="100%" />
                  <WorkerCircleStat icon={UserCheck} tone="green" label={s.factLabel} value={`${weeklyStats?.attendancePercent ?? 0}%`} />
                  <WorkerCircleStat icon={Clock3} tone="orange" label={s.latesLabel} value={String(weeklyStats?.lateDays ?? 0)} />
                  <WorkerCircleStat icon={UserRoundX} tone="red" label={s.absencesLabel} value={String(weeklyStats?.absentDays ?? 0)} />
                </div>
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.scheduleTitle(formatDateShort(today))}</h2>
              {timeline.length > 0 ? (
                <div className="relative mt-4 space-y-4">
                  {timeline.map((event, i) => {
                    const Icon = timelineIcon[event.kind];
                    return (
                      <div key={event.id} className="relative flex items-start gap-3">
                        {i < timeline.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%+4px)] w-px bg-border" aria-hidden="true" />}
                        <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", event.done ? "bg-green-soft text-green" : "bg-surface-3 text-ink-secondary")}>
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm font-medium text-ink">{timelineLabel[event.kind]}</p>
                          <p className="text-xs tabular text-ink-secondary">{event.time}</p>
                        </div>
                        {event.done && <CircleCheckBig size={16} className="mt-1.5 shrink-0 text-green" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-muted">{s.emptyTimeline}</p>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.dailySummaryTitle}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <DailyStat tone="green" label={s.dailySummaryPresence} value={todayRecord?.status === "absent" || !todayRecord ? s.dailySummaryNo : s.dailySummaryYes} />
                <DailyStat tone="orange" label={s.dailySummaryLate} value={formatDurationMinutes(dailyLateMinutes)} />
                <DailyStat tone="purple" label={s.dailySummaryOvertime} value={formatDurationMinutes(dailyOvertimeMinutes)} />
                <DailyStat tone="blue" label={s.dailySummaryAttendance} value={`${dailyAttendancePercent}%`} />
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.remindersTitle}</h2>
              {myReminders.length > 0 ? (
                <div className="mt-2 divide-y divide-border">
                  {myReminders.map((n) => {
                    const Icon = NOTIFICATION_ICON[n.type];
                    return (
                      <div key={n.id} className="flex items-center gap-3 py-2.5">
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", NOTIFICATION_TONE_CLASS[n.type])}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{n.title}</p>
                          <p className="truncate text-xs text-ink-secondary">{n.description}</p>
                        </div>
                        <ChevronRight size={15} className="shrink-0 text-ink-muted" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-muted">{s.emptyReminders}</p>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.shortSummaryTitle}</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.shortSummaryObject}</dt>
                  <dd className="truncate font-medium text-ink">{object?.name ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.shortSummaryProrab}</dt>
                  <dd className="truncate font-medium text-ink">{prorab?.fullName ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.shortSummaryNextCheck}</dt>
                  <dd className="font-medium text-ink">{formatDateShort(nextWorkday)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.shortSummaryActiveTasks}</dt>
                  <dd className="font-medium text-ink">{activeTasksCount}</dd>
                </div>
              </dl>
              <Button
                className="mt-4 w-full"
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

interface WeekdayDateTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  points: { date: string; weekdayLabel: string; dateLabel: string }[];
}

/** Two-line X-axis tick (weekday bold on top, short date below) matching the reference's richer
 * axis labels — Recharts' plain tickFormatter only supports a single line of text. */
function WeekdayDateTick({ x = 0, y = 0, payload, points }: WeekdayDateTickProps) {
  const point = points.find((p) => p.date === payload?.value);
  if (!point) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fontWeight={600} fill="#171717">
        {point.weekdayLabel}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fontSize={10} fill="#9CA3AF">
        {point.dateLabel.slice(0, 5)}
      </text>
    </g>
  );
}

function DailyStat({ tone, label, value }: { tone: "green" | "orange" | "purple" | "blue"; label: string; value: string }) {
  const toneClass = { green: "text-green", orange: "text-warning", purple: "text-purple", blue: "text-blue" }[tone];
  return (
    <div className="rounded-xl bg-surface-1 p-3">
      <p className={cn("text-lg font-bold", toneClass)}>{value}</p>
      <p className="mt-0.5 text-xs text-ink-secondary">{label}</p>
    </div>
  );
}
