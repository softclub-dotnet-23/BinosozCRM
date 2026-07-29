import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "../../ui/Card";
import { useLanguage } from "../../../context/LanguageContext";
import type { ProfileStats } from "../../../utils/workerProfileAnalytics";

const ATTENDANCE_COLOR = "#18A957";

export function ProfileStatisticsCard({ stats }: { stats: ProfileStats }) {
  const { strings } = useLanguage();
  const s = strings.worker;

  const labelByKey: Record<string, string> = {
    completedTasks: s.profileStatCompletedTasks,
    photoReports: s.profileStatPhotoReports,
    remarks: s.profileStatRemarks,
  };
  const chartData = stats.segments.filter((seg) => seg.value > 0);
  const displayData = chartData.length > 0 ? chartData : stats.segments;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.profileStatsTitle}</h2>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={displayData} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={2} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}>
                {displayData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const entry = payload[0].payload as (typeof stats.segments)[number];
                  return (
                    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-[var(--shadow-popover)]">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-ink-secondary">{labelByKey[entry.key]}:</span>
                        <span className="font-semibold text-ink tabular">{entry.value}</span>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xl font-bold leading-none tabular text-ink">{stats.total}</p>
            <p className="mt-1 text-[10px] text-ink-secondary">{s.profileStatsTotalLabel}</p>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-2 text-xs">
          {stats.segments.map((seg) => (
            <li key={seg.key} className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="min-w-0 flex-1 truncate text-ink-secondary">{labelByKey[seg.key]}</span>
              <span className="shrink-0 font-semibold tabular text-ink">{seg.value}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ATTENDANCE_COLOR }} />
            <span className="min-w-0 flex-1 truncate text-ink-secondary">{s.profileStatAttendance}</span>
            <span className="shrink-0 font-semibold tabular text-ink">{stats.attendancePercent}%</span>
          </li>
        </ul>
      </div>
    </Card>
  );
}
