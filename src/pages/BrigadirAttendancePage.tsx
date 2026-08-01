import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "../components/layout/AppLayout";
import { useChartAnimation } from "../hooks/useChartAnimation";
import { useToast } from "../hooks/useToast";
import { cn } from "../utils/cn";
import {
  AlertIcon,
  Badge,
  BarChartIcon,
  BuildingIcon,
  Card,
  CardHeader,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  EyeIcon,
  KpiCard,
  PersonAvatar,
  PhoneIcon,
  UserIcon,
  UserXIcon,
} from "../components/brigadir/shared";

type AttendanceStatus = "present" | "late" | "absent" | "dayoff";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Присутствует",
  late: "Опоздал",
  absent: "Отсутствует",
  dayoff: "Выходной",
};
const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: "green",
  late: "orange",
  absent: "red",
  dayoff: "gray",
};

const people = [
  { name: "Абдуллоев Бахтиёр", role: "Арматурщик", photo: "abdulloev-bakhtiyor.jpg", arrival: "08:05", departure: "—", status: "present" as AttendanceStatus, note: "—" },
  { name: "Юсупов Далер", role: "Плотник", photo: "daler-yusupov.jpg", arrival: "08:18", departure: "—", status: "late" as AttendanceStatus, note: "Опоздание 18 мин" },
  { name: "Рустамов Комрон", role: "Мастер", photo: "rustamov-komron.jpg", arrival: "—", departure: "—", status: "absent" as AttendanceStatus, note: "Не вышел" },
  { name: "Темуров Фирӯз", role: "Подсобный рабочий", photo: "temurov-firuz.jpg", arrival: "08:02", departure: "17:05", status: "present" as AttendanceStatus, note: "—" },
  { name: "Саидов Акмал", role: "Бетонщик", photo: "rustam-saidov.jpg", arrival: "08:30", departure: "—", status: "late" as AttendanceStatus, note: "Опоздание 30 мин" },
  { name: "Ибрагимов Шохрух", role: "Сварщик", photo: "mirzoev-shakhrom.jpg", arrival: "—", departure: "—", status: "dayoff" as AttendanceStatus, note: "—" },
];

const TABS: { key: "all" | AttendanceStatus; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "present", label: "Присутствуют" },
  { key: "late", label: "Опоздания" },
  { key: "absent", label: "Отсутствуют" },
];

const weekAttendance = [
  { day: "Пн|14 июл", value: 95 },
  { day: "Вт|15 июл", value: 90 },
  { day: "Ср|16 июл", value: 93 },
  { day: "Чт|17 июл", value: 88 },
  { day: "Пт|18 июл", value: 94 },
  { day: "Сб|19 июл", value: 85 },
  { day: "Вс|20 июл", value: 80 },
];

const daySummary = [
  { label: "Присутствуют", value: "22", color: "green", icon: UserIcon },
  { label: "Опоздали", value: "3", color: "orange", icon: ClockIcon },
  { label: "Отсутствуют", value: "3", color: "red", icon: UserXIcon },
  { label: "Средняя явка", value: "92%", color: "blue", icon: BarChartIcon },
];

type TimelineState = "done" | "current" | "upcoming";

function buildTimeline(person: (typeof people)[number]): { label: string; time: string; state: TimelineState }[] {
  const raw = [
    { label: "Утренний приход", time: person.arrival, filled: person.arrival !== "—" },
    { label: "Обеденный перерыв", time: person.arrival !== "—" ? "12:30 – 13:00" : "—", filled: person.arrival !== "—" },
    { label: "Окончание смены", time: person.departure, filled: person.departure !== "—" },
    { label: "Проверка безопасности", time: "—", filled: false },
  ];
  let currentAssigned = false;
  return raw.map(({ label, time, filled }) => {
    if (filled) return { label, time, state: "done" as const };
    if (!currentAssigned && (person.status === "present" || person.status === "late")) {
      currentAssigned = true;
      return { label, time, state: "current" as const };
    }
    return { label, time, state: "upcoming" as const };
  });
}

function BarValueLabel({ x = 0, y = 0, width = 0, value }: { x?: number; y?: number; width?: number; value?: number }) {
  return (
    <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155">
      {value}%
    </text>
  );
}

function DayTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const [day = "", date = ""] = (payload?.value ?? "").split("|");
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#64748b" fontSize="9">
        <tspan x="0" dy="12">{day}</tspan>
        <tspan x="0" dy="12">{date}</tspan>
      </text>
    </g>
  );
}

export default function BrigadirAttendancePage() {
  const { showToast } = useToast();
  const chartAnim = useChartAnimation();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | AttendanceStatus>("all");
  const [selected, setSelected] = useState(0);

  const searched = people.filter((p) => `${p.name} ${p.role}`.toLowerCase().includes(search.toLowerCase()));
  const filtered = tab === "all" ? searched : searched.filter((p) => p.status === tab);
  const person = people[selected];
  const timeline = useMemo(() => buildTimeline(person), [person]);

  return (
    <AppLayout
      title="Посещаемость"
      subtitle="Учет присутствия бригады, опозданий и отсутствий"
      titleBelowHeader
      contentMaxWidth="1280px"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск..." }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Всего отметок" value="28" note="за сегодня" color="blue" icon={ClipboardIcon} />
        <KpiCard label="Присутствуют" value="22" note="на объекте сейчас" color="green" icon={UserIcon} />
        <KpiCard label="Опоздания" value="3" note="сегодня" color="orange" icon={ClockIcon} />
        <KpiCard label="Отсутствуют" value="3" note="не вышли" color="red" icon={UserXIcon} />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-[15px] font-bold">Список посещаемости</h2>
              <button
                type="button"
                onClick={() => showToast("Выбор даты — функция в разработке", "info")}
                className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-surface-2"
              >
                <CalendarIcon size={14} className="text-ink-muted" /> 20 июля 2026 <ChevronDownIcon size={13} className="text-ink-muted" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 px-5 pt-3.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                    tab === t.key ? "border-primary/50 bg-primary-soft text-primary" : "border-border-strong text-ink-secondary hover:bg-surface-2",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-3 table-scroll-x overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-slate-50 text-[10px] font-semibold text-ink-muted">
                  <tr>
                    <th className="px-5 py-2.5">Сотрудник</th>
                    <th className="px-2">Объект</th>
                    <th className="px-2">Приход</th>
                    <th className="px-2">Уход</th>
                    <th className="px-2">Статус</th>
                    <th className="px-2">Примечание</th>
                    <th className="px-5 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((row) => {
                    const idx = people.findIndex((p) => p.name === row.name);
                    const resolved = row.status === "dayoff" || (row.status === "present" && row.departure !== "—");
                    return (
                      <tr
                        key={row.name}
                        onClick={() => setSelected(idx)}
                        className={cn("cursor-pointer text-[11.5px] hover:bg-orange-50/40", selected === idx && "bg-orange-50/60")}
                      >
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <PersonAvatar name={row.name} photo={row.photo} size={30} />
                            <span className="whitespace-nowrap font-semibold">{row.name}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 text-ink-secondary">ЖК «Сомони»</td>
                        <td className="whitespace-nowrap px-2 text-ink-secondary">{row.arrival}</td>
                        <td className="whitespace-nowrap px-2 text-ink-secondary">{row.departure}</td>
                        <td className="whitespace-nowrap px-2">
                          <Badge color={STATUS_COLOR[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-2 text-ink-secondary">{row.note}</td>
                        <td className="px-5 text-right">
                          {resolved ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(idx);
                              }}
                              aria-label="Открыть"
                              className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-ink-secondary hover:bg-surface-2"
                            >
                              <EyeIcon size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(idx);
                              }}
                              className="ml-auto rounded-md border border-primary/50 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-white"
                            >
                              Открыть
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-ink-muted">Ничего не найдено</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[11px] text-ink-secondary">
              <span>Показано 1–6 из 28</span>
              <div className="flex gap-1">
                {["‹", "1", "2", "3", "…", "5", "›"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => showToast("Переход по страницам — функция в разработке", "info")}
                    className={cn(
                      "h-7 min-w-7 rounded-md border px-1.5 text-xs font-semibold",
                      n === "1" ? "border-primary/50 bg-primary-soft text-primary" : "border-border-strong text-ink-secondary hover:bg-surface-2",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl">
            <h2 className="text-[15px] font-bold">Посещаемость за неделю</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_96px]">
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekAttendance} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={<DayTick />} height={32} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(30, 79, 122, 0.05)" }}
                      contentStyle={{
                        padding: "6px 9px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "rgba(255,255,255,.97)",
                        boxShadow: "0 6px 18px rgba(15,23,42,.10)",
                        fontSize: "10px",
                        lineHeight: 1.25,
                      }}
                      labelStyle={{ marginBottom: "3px", color: "#64748b", fontSize: "9px", fontWeight: 600 }}
                      itemStyle={{ padding: 0, color: "#1e4f7a", fontSize: "10px", fontWeight: 700 }}
                      separator=": "
                    />
                    <Bar dataKey="value" name="Посещаемость" fill="#1e4f7a" radius={[3, 3, 0, 0]} maxBarSize={28} {...chartAnim}>
                      <LabelList dataKey="value" content={<BarValueLabel />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
                {[
                  ["Норма", "100%", "text-ink"],
                  ["Факт", "92%", "text-green"],
                  ["Опоздания", "3", "text-warning"],
                  ["Пропуски", "2", "text-red"],
                ].map(([a, b, c]) => (
                  <div key={a} className="flex h-[45px] flex-col justify-center rounded-lg border border-border px-2.5 py-1">
                    <p className="text-[9px] text-ink-muted">{a}</p>
                    <b className={cn("block text-[17px] leading-tight", c)}>{b}</b>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader onMore={() => showToast("Действия с деталями посещаемости", "info")}>Детали посещаемости</CardHeader>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <PersonAvatar name={person.name} photo={person.photo} size={48} />
                <div>
                  <p className="text-sm font-bold">{person.name}</p>
                  <p className="text-xs text-ink-muted">{person.role}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-ink-secondary"><BuildingIcon size={13} className="text-ink-muted" /> Объект:</dt>
                  <dd className="font-semibold">ЖК «Сомони»</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-ink-secondary"><UserIcon size={13} className="text-ink-muted" /> Бригадир:</dt>
                  <dd className="font-semibold">Комрон Саидов</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-ink-secondary"><ClockIcon size={13} className="text-ink-muted" /> Время прихода:</dt>
                  <dd className="font-semibold">{person.arrival}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-ink-secondary"><CheckIcon size={13} className="text-ink-muted" /> Статус:</dt>
                  <dd><Badge color={STATUS_COLOR[person.status]}>{STATUS_LABEL[person.status]}</Badge></dd>
                </div>
              </dl>

              <div className="relative mt-5 space-y-4 pl-6 text-xs before:absolute before:bottom-3 before:left-[7px] before:top-2 before:w-px before:bg-border">
                {timeline.map((step) => (
                  <div key={step.label} className="relative flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "absolute -left-6 top-0 grid h-3.5 w-3.5 place-items-center rounded-full border",
                        step.state === "done" && "border-green bg-green text-white",
                        step.state === "current" && "border-blue bg-white",
                        step.state === "upcoming" && "border-border-strong bg-white",
                      )}
                    >
                      {step.state === "done" && <CheckIcon size={9} />}
                    </span>
                    <span className="text-ink-secondary">{step.label}</span>
                    <b>{step.time}</b>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => showToast("Статус отмечен")}
                  className="h-10 rounded-[10px] bg-primary text-xs font-bold text-white hover:bg-primary-hover"
                >
                  Отметить статус
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Проблема отправлена прорабу", "info")}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-primary/50 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                >
                  <AlertIcon size={14} /> Сообщить о проблеме
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl">
            <h2 className="text-[14px] font-bold">Сводка за день</h2>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              {daySummary.map((s) => (
                <div key={s.label} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                    <s.icon size={13} className={cn(s.color === "green" && "text-green", s.color === "orange" && "text-warning", s.color === "red" && "text-red", s.color === "blue" && "text-blue")} />
                    {s.label}
                  </div>
                  <b className="mt-1 block text-xl">{s.value}</b>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 rounded-2xl">
            <h2 className="text-[14px] font-bold">Краткая сводка</h2>
            <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <p className="flex flex-col gap-0.5"><span className="text-ink-muted">Объект</span><b className="font-semibold">ЖК «Сомони»</b></p>
              <p className="flex flex-col gap-0.5"><span className="text-ink-muted">Активных задач</span><b className="font-semibold">5</b></p>
              <p className="flex flex-col gap-0.5"><span className="text-ink-muted">Прораб</span><b className="font-semibold">Комрон Саидов</b></p>
              <p className="flex flex-col gap-0.5"><span className="text-ink-muted">Замечания</span><b className="font-semibold text-red">2</b></p>
              <p className="col-span-2 flex flex-col gap-0.5"><span className="text-ink-muted">Следующая проверка</span><b className="font-semibold">20 июля</b></p>
            </div>
            <button
              type="button"
              onClick={() => showToast("Звонок прорабу", "info")}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-primary/50 text-xs font-bold text-primary hover:bg-primary hover:text-white"
            >
              <PhoneIcon size={14} /> Связаться с прорабом
            </button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
