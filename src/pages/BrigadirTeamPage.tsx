import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import { cn } from "../utils/cn";
import {
  BoltIcon,
  BoxIcon,
  BuildingIcon,
  CalendarIcon,
  Card,
  CardHeader,
  CheckIcon,
  AlertIcon,
  Badge,
  HammerIcon,
  KpiCard,
  MasterIcon,
  PersonAvatar,
  PhoneIcon,
  RebarIcon,
  TrowelIcon,
  UserIcon,
  UserXIcon,
  UsersIcon,
  WalkingPersonIcon,
  WelderSparkIcon,
  WheelbarrowIcon,
  tone,
} from "../components/brigadir/shared";

const team = [
  ["Абдуллоев Бахтиёр", "Арматурщик", "На объекте", "08:05", "+992 90 123 45 67", "abdulloev-bakhtiyor.jpg", "green"],
  ["Юсупов Далер", "Плотник", "На объекте", "07:58", "+992 90 234 56 78", "daler-yusupov.jpg", "green"],
  ["Рустамов Комрон", "Мастер", "На объекте", "08:20", "+992 90 345 67 89", "rustamov-komron.jpg", "green"],
  ["Темуров Фирӯз", "Подсобный рабочий", "Опоздание", "08:35", "+992 90 456 78 90", "temurov-firuz.jpg", "orange"],
  ["Саидов Акмал", "Бетонщик", "На объекте", "08:00", "+992 90 567 89 01", "rustam-saidov.jpg", "green"],
  ["Ибрагимов Шохрух", "Сварщик", "Отсутствует", "—", "+992 90 678 90 12", "mirzoev-shakhrom.jpg", "red"],
  ["Мирзоев Низом", "Арматурщик", "Выходной", "—", "+992 90 789 01 23", "nozim-ikromov.jpg", "gray"],
  ["Холов Икром", "Подсобный рабочий", "На объекте", "08:10", "+992 90 890 12 34", "mukhiddin-kholov.jpg", "green"],
] as const;

const roles = [
  ["Арматурщик", 3, "blue", RebarIcon],
  ["Подсобный рабочий", 3, "purple", WalkingPersonIcon],
  ["Плотник", 2, "orange", HammerIcon],
  ["Бетонщик", 2, "purple", WheelbarrowIcon],
  ["Мастер", 1, "green", MasterIcon],
  ["Сварщик", 1, "orange", WelderSparkIcon],
] as const;

const tasks = [
  ["Заливка фундамента", "ЖК «Сомон»", "В работе", "blue", BuildingIcon],
  ["Электромонтаж", "Бизнес-центр «Ватан»", "Нужна проверка", "orange", BoltIcon],
  ["Кладка стен", "Школа №25", "По графику", "green", TrowelIcon],
  ["Подготовка материалов", "Коттедж «Наврӯз»", "Срочно", "red", BoxIcon],
] as const;

const attendanceData = [
  { day: "Пн|14 июл", value: 95 },
  { day: "Вт|15 июл", value: 90 },
  { day: "Ср|16 июл", value: 93 },
  { day: "Чт|17 июл", value: 88 },
  { day: "Пт|18 июл", value: 94 },
  { day: "Сб|19 июл", value: 85 },
  { day: "Вс|20 июл", value: 80 },
];

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

export default function BrigadirTeamPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const visibleTeam = team.filter((row) => `${row[0]} ${row[1]} ${row[2]} ${row[4]}`.toLowerCase().includes(search.toLowerCase()));
  const visibleTasks = tasks.filter((row) => `${row[0]} ${row[1]} ${row[2]}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout title="Моя бригада" subtitle="Состав бригады, роли, посещаемость и производительность" titleBelowHeader contentMaxWidth="1280px" search={{ value: search, onChange: setSearch, placeholder: "Поиск..." }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 [&>section]:min-h-[80px]">
        <KpiCard label="Всего сотрудников" value="12" note="" color="blue" icon={UsersIcon} />
        <KpiCard label="На объекте сегодня" value="10" note="" color="green" icon={CheckIcon} />
        <KpiCard label="Отсутствуют" value="2" note="" color="red" icon={UserXIcon} />
        <KpiCard label="Средняя посещаемость" value="92%" note="" color="green" icon={CheckIcon} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.03fr_1fr]">
        <Card className="overflow-hidden lg:row-span-2">
          <CardHeader onMore={() => showToast("Действия со списком бригады открыты", "info")}>Список бригады</CardHeader>
          <div className="table-scroll-x overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-semibold text-ink-muted">
                  <th className="whitespace-nowrap px-3 py-2.5">Сотрудник</th>
                  <th className="whitespace-nowrap px-1.5">Должность</th>
                  <th className="whitespace-nowrap px-1.5">Статус</th>
                  <th className="whitespace-nowrap px-1.5">Приход</th>
                  <th className="whitespace-nowrap px-3">Телефон</th>
                </tr>
              </thead>
              <tbody>
                {visibleTeam.map((r) => (
                  <tr key={r[0]} className="border-t border-border hover:bg-orange-50/40">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <PersonAvatar name={r[0]} photo={r[5]} size={24} />
                        <span className="whitespace-nowrap text-[11px] font-semibold">{r[0]}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-1.5 text-[10px] text-ink-secondary">{r[1]}</td>
                    <td className="whitespace-nowrap px-1.5">
                      <Badge color={r[6]}>{r[2]}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-1.5 text-[10px] text-ink-secondary">{r[3]}</td>
                    <td className="whitespace-nowrap px-3 text-[10px] text-ink-secondary">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => navigate("/brigades/composition")}
            className="flex w-full items-center justify-between border-t border-border px-5 py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"
          >
            <span>Показать весь состав</span>
            <span>→</span>
          </button>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader onMore={() => navigate("/brigades/composition")}>Роли в бригаде</CardHeader>
          <div className="grid grid-cols-2 gap-2 p-3">
            {roles.map(([name, count, color, Icon]) => (
              <div key={name} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5" title={name}>
                <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", tone[color])}>
                  <Icon size={13} />
                </div>
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold">{name}</span>
                <b className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md border border-border bg-white px-1 text-sm shadow-sm">{count}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden lg:col-start-2">
          <CardHeader onMore={() => navigate("/works")}>Ближайшие задачи бригады</CardHeader>
          <div className="divide-y divide-border px-4">
            {visibleTasks.map(([name, obj, status, color, Icon]) => (
              <div key={name} className="grid grid-cols-[32px_minmax(0,1fr)_auto_78px] items-center gap-2 py-1.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", tone[color])}>
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold">{name}</p>
                  <p className="truncate text-[9px] text-ink-muted">{obj}</p>
                </div>
                <div className="flex justify-center"><Badge color={color}>{status}</Badge></div>
                <button
                  onClick={() => navigate("/works", { state: { work: name } })}
                  className="shrink-0 rounded-md border border-primary/60 px-3 py-1 text-[9px] font-bold text-primary hover:bg-primary hover:text-white"
                >
                  Открыть
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.38fr_.82fr]">
        <Card className="overflow-hidden p-4 lg:h-[250px]">
          <h2 className="text-[15px] font-bold">Посещаемость за неделю</h2>
          <div className="mt-2 grid items-start gap-3 lg:grid-cols-[1fr_100px]">
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData} margin={{ top: 20, right: 4, left: -20, bottom: 0 }}>
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
                  <Bar dataKey="value" name="Посещаемость" fill="#1e4f7a" radius={[3, 3, 0, 0]} maxBarSize={28}>
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
                <div key={a} className="flex h-[43px] flex-col justify-center rounded-lg border border-border px-2 py-1">
                  <p className="text-[9px] text-ink-muted">{a}</p>
                  <b className={cn("block text-[17px] leading-tight", c)}>{b}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold">Краткая информация</h2>
          </div>
          <div className="mt-3 divide-y divide-border">
            {(
              [
                [UserIcon, "Бригадир:", "Комрон Саидов", false],
                [BuildingIcon, "Объект:", "ЖК «Сомон»", false],
                [UserIcon, "Прораб:", "Комрон Саидов", false],
                [CalendarIcon, "Следующая проверка:", "20 июля", false],
                [AlertIcon, "Активных задач:", "5", false],
                [AlertIcon, "Замечания:", "2", true],
              ] as const
            ).map(([Icon, a, b, danger], i) => (
              <div key={String(a) + i} className="flex items-center gap-2 py-1.5 text-[10px]">
                <Icon size={14} className="text-ink-muted" />
                <span className="text-ink-secondary">{a}</span>
                <b className={cn("ml-auto", danger && "text-red")}>{b}</b>
              </div>
            ))}
          </div>
          <a
            href="tel:+992901112233"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/60 py-2 text-[10px] font-bold text-primary hover:bg-primary hover:text-white"
          >
            <PhoneIcon size={15} /> Связаться с прорабом
          </a>
        </Card>
      </div>
    </AppLayout>
  );
}
