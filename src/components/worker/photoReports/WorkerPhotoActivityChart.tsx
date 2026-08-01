import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Camera, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Card } from "../../ui/Card";
import { WorkerCircleStat } from "../WorkerCircleKpiCard";
import { useLanguage } from "../../../context/LanguageContext";
import { useChartAnimation } from "../../../hooks/useChartAnimation";
import type { PhotoActivityPoint } from "../../../utils/workerPhotoReportsAnalytics";
import type { PhotoReportStats } from "../../../utils/workerPhotoReportsAnalytics";

export function WorkerPhotoActivityChart({ points, stats }: { points: PhotoActivityPoint[]; stats: PhotoReportStats }) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const chartAnim = useChartAnimation(900);

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.photoActivityTitle}</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
        <div className="h-[190px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke="#E9EDF3" strokeDasharray="0" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(0, 5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
                contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 12, boxShadow: "var(--shadow-popover)" }}
                formatter={(value, name) => [value, name === "uploaded" ? s.photoActivityUploaded : s.photoActivityApproved]}
              />
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: 12 }}
                content={() => (
                  <div className="mb-1 flex items-center justify-center gap-4 text-xs text-ink-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#2F6FED" }} />
                      {s.photoActivityUploaded}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#20B15A" }} />
                      {s.photoActivityApproved}
                    </span>
                  </div>
                )}
              />
              <Bar dataKey="uploaded" name="uploaded" fill="#2F6FED" radius={[4, 4, 0, 0]} maxBarSize={22} {...chartAnim} />
              <Bar dataKey="approved" name="approved" fill="#20B15A" radius={[4, 4, 0, 0]} maxBarSize={22} {...chartAnim} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-row gap-2 border-l-0 md:flex-col md:border-l md:border-border md:pl-4">
          <WorkerCircleStat icon={Camera} tone="blue" label={s.photoActivityUploaded} value={String(stats.total)} />
          <WorkerCircleStat icon={CheckCircle2} tone="green" label={s.photoStatusApproved} value={String(stats.approved)} />
          <WorkerCircleStat icon={XCircle} tone="red" label={s.photoStatusRejected} value={String(stats.rejected)} />
          <WorkerCircleStat icon={Clock3} tone="orange" label={s.photoStatusPending} value={String(stats.pending)} />
        </div>
      </div>
    </Card>
  );
}
