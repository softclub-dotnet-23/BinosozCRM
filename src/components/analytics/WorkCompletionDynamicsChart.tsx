import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../ui/Card";
import { useLanguage } from "../../context/LanguageContext";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { computeWorkCompletionSeries, majorTickDates, formatChartDayLabel } from "../../utils/workCompletionAnalytics";
import { WorkCompletionTooltip, WORK_COMPLETION_COLORS as C } from "./WorkCompletionTooltip";
import type { Work } from "../../types";

interface WorkCompletionDynamicsChartProps {
  works: Work[];
  dateFrom: string;
  dateTo: string;
}

export function WorkCompletionDynamicsChart({ works, dateFrom, dateTo }: WorkCompletionDynamicsChartProps) {
  const { strings } = useLanguage();
  const s = strings.brigadirReports;
  const reduceMotion = usePrefersReducedMotion();
  const isMobile = useMediaQuery("(max-width: 639px)");

  const data = useMemo(() => computeWorkCompletionSeries(works, dateFrom, dateTo), [works, dateFrom, dateTo]);
  const fullMonthNames = useMemo(
    () => [
      strings.brigades.monthJan, strings.brigades.monthFeb, strings.brigades.monthMar, strings.brigades.monthApr,
      strings.brigades.monthMay, strings.brigades.monthJun, strings.brigades.monthJul, strings.brigades.monthAug,
      strings.brigades.monthSep, strings.brigades.monthOct, strings.brigades.monthNov, strings.brigades.monthDec,
    ],
    [strings.brigades],
  );
  const formatDayLabel = useMemo(() => (iso: string) => formatChartDayLabel(iso, fullMonthNames), [fullMonthNames]);
  const majorTicks = useMemo(() => majorTickDates(dateFrom, dateTo, isMobile ? 4 : 7), [dateFrom, dateTo, isMobile]);

  return (
    <Card className="flex h-[290px] flex-col p-5 sm:h-[320px] lg:h-[340px]">
      <div className="shrink-0">
        <h2 className="text-base font-semibold text-ink sm:text-lg">{s.dynamicsTitle}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary sm:gap-x-4">
          <LegendDot color={C.plan} label={s.seriesPlanned} />
          <LegendDot color={C.actual} label={s.seriesActual} />
          <LegendDot color={C.completion} label={s.seriesRate} />
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="workCompletionFactFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.actual} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={C.actual} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="date"
                type="category"
                ticks={majorTicks}
                tickFormatter={formatDayLabel}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: C.axisText }}
                tickMargin={8}
                interval={0}
              />
              <YAxis
                yAxisId="pct"
                orientation="left"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: C.axisText }}
                width={36}
              />
              <YAxis
                yAxisId="num"
                orientation="right"
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: C.axisText }}
                width={28}
              />
              <Tooltip
                cursor={{ stroke: C.grid }}
                isAnimationActive={false}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ zIndex: 30, outline: "none" }}
                content={(props) => (
                  <WorkCompletionTooltip
                    {...props}
                    formatDayLabel={formatDayLabel}
                    planLabel={s.seriesPlanned}
                    actualLabel={s.seriesActual}
                    completionLabel={s.seriesRate}
                  />
                )}
              />
              <Area
                yAxisId="num"
                type="monotone"
                dataKey="actual"
                stroke={C.actual}
                strokeWidth={2}
                fill="url(#workCompletionFactFill)"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={!reduceMotion}
                animationDuration={1000}
                animationEasing="ease-out"
                animationBegin={100}
              />
              <Line
                yAxisId="num"
                type="monotone"
                dataKey="plan"
                stroke={C.plan}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={!reduceMotion}
                animationDuration={1000}
                animationEasing="ease-out"
                animationBegin={0}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="completionPercent"
                stroke={C.completion}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={!reduceMotion}
                animationDuration={1000}
                animationEasing="ease-out"
                animationBegin={180}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">{s.emptyChartData}</div>
        )}
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
