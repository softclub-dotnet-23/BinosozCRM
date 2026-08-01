import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartAnimation } from "../hooks/useChartAnimation";
import { AppLayout } from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import {
  Badge,
  CalendarIcon,
  Card,
  CardHeader,
  CheckIcon,
  DocumentIcon,
  DownloadIcon,
  KpiCard,
  MoreIcon,
  PersonAvatar,
  UsersIcon,
  WalletIcon,
} from "../components/brigadir/shared";

type PayStatus = "prepared" | "review" | "paid";

const STATUS_LABEL: Record<PayStatus, string> = {
  prepared: "Подготовлено",
  review: "На проверке",
  paid: "Выплачено",
};
const STATUS_COLOR: Record<PayStatus, string> = {
  prepared: "blue",
  review: "orange",
  paid: "green",
};

const employees = [
  { name: "Абдуллоев Бахтиёр", role: "Арматурщик", photo: "abdulloev-bakhtiyor.jpg", days: 26, accrued: 6500000, deductions: 1200000, payout: 5300000, status: "prepared" as PayStatus },
  { name: "Юсупов Далер", role: "Плотник", photo: "daler-yusupov.jpg", days: 25, accrued: 5800000, deductions: 1000000, payout: 4800000, status: "prepared" as PayStatus },
  { name: "Рустамов Комрон", role: "Мастер", photo: "rustamov-komron.jpg", days: 26, accrued: 7200000, deductions: 1300000, payout: 5900000, status: "review" as PayStatus },
  { name: "Темуров Фирӯз", role: "Подсобный рабочий", photo: "temurov-firuz.jpg", days: 24, accrued: 3600000, deductions: 650000, payout: 2950000, status: "prepared" as PayStatus },
  { name: "Саидов Акмал", role: "Бетонщик", photo: "rustam-saidov.jpg", days: 26, accrued: 5900000, deductions: 1050000, payout: 4850000, status: "paid" as PayStatus },
  { name: "Ибрагимов Шохрух", role: "Сварщик", photo: "mirzoev-shakhrom.jpg", days: 25, accrued: 5100000, deductions: 900000, payout: 4200000, status: "paid" as PayStatus },
  { name: "Мирзоев Низом", role: "Арматурщик", photo: "nozim-ikromov.jpg", days: 22, accrued: 4000000, deductions: 700000, payout: 3300000, status: "paid" as PayStatus },
  { name: "Холов Икром", role: "Подсобный рабочий", photo: "mukhiddin-kholov.jpg", days: 26, accrued: 3550000, deductions: 650000, payout: 2900000, status: "prepared" as PayStatus },
  { name: "Каримов Беҳзод", role: "Электромонтажник", days: 22, accrued: 3900000, deductions: 700000, payout: 3200000, status: "review" as PayStatus },
  { name: "Алимов Жахонгир", role: "Кладчик стен", days: 24, accrued: 4400000, deductions: 800000, payout: 3600000, status: "prepared" as PayStatus },
];

const weeklyAccrual = [
  { period: "1–7 июл", value: 9.2 },
  { period: "8–14 июл", value: 11.6 },
  { period: "15–21 июл", value: 13.4 },
  { period: "22–28 июл", value: 10.3 },
  { period: "29 июл – 30 июл", value: 3.3 },
];

const upcomingPayments = [
  { name: "Рустамов Комрон", role: "Мастер", photo: "rustamov-komron.jpg", amount: 5900000, date: "20 июля" },
  { name: "Юсупов Далер", role: "Плотник", photo: "daler-yusupov.jpg", amount: 4800000, date: "20 июля" },
  { name: "Абдуллоев Бахтиёр", role: "Арматурщик", photo: "abdulloev-bakhtiyor.jpg", amount: 5300000, date: "20 июля" },
  { name: "Темуров Фирӯз", role: "Подсобный рабочий", photo: "temurov-firuz.jpg", amount: 2950000, date: "20 июля" },
  { name: "Каримов Беҳзод", role: "Электромонтажник", amount: 3200000, date: "25 июля" },
];

const statusBreakdown = [
  { key: "paid" as PayStatus, count: 3, pct: 30 },
  { key: "review" as PayStatus, count: 2, pct: 20 },
  { key: "prepared" as PayStatus, count: 5, pct: 50 },
];

const STATUS_HEX: Record<PayStatus, string> = { paid: "#22c55e", review: "#f59e0b", prepared: "#3b82f6" };

function formatSum(n: number): string {
  return `${n.toLocaleString("ru-RU")} сум`;
}

function BarValueLabel({ x = 0, y = 0, width = 0, value }: { x?: number; y?: number; width?: number; value?: number }) {
  return (
    <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155">
      {value}M
    </text>
  );
}

export default function BrigadirSalaryPage() {
  const { showToast } = useToast();
  const chartAnim = useChartAnimation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const visible = employees.filter((e) => {
    if (!`${e.name} ${e.role}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (roleFilter !== "all" && e.role !== roleFilter) return false;
    return true;
  });

  const roles = Array.from(new Set(employees.map((e) => e.role)));

  const donutGradient = (() => {
    let acc = 0;
    const stops = statusBreakdown.map((s) => {
      const start = acc;
      acc += s.pct;
      return `${STATUS_HEX[s.key]} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  return (
    <AppLayout
      title="Зарплата"
      subtitle="Начисления, удержания и выплаты по моей бригаде"
      titleBelowHeader
      contentMaxWidth="1280px"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск..." }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="К выплате" value="38 900 000 сум" note="По бригаде за период" color="green" icon={WalletIcon} />
        <KpiCard label="Сотрудников" value="10" note="В составе бригады" color="blue" icon={UsersIcon} />
        <KpiCard label="Начислено" value="47 850 000 сум" note="Общая сумма начислений" color="purple" icon={WalletIcon} />
        <KpiCard label="Удержания" value="8 950 000 сум" note="Налоги и удержания" color="orange" icon={DocumentIcon} />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="rounded-2xl p-4">
            <div className="flex flex-wrap items-end gap-2.5">
              <label className="block text-xs font-semibold text-ink">
                Период
                <div className="mt-1.5 flex h-10 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink-secondary">
                  <CalendarIcon size={14} className="text-ink-muted" /> 1 – 30 июль 2026
                </div>
              </label>
              <label className="block text-xs font-semibold text-ink">
                Статус
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1.5 h-10 w-36 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink">
                  <option value="all">Все</option>
                  <option value="prepared">Подготовлено</option>
                  <option value="review">На проверке</option>
                  <option value="paid">Выплачено</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink">
                Роль
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="mt-1.5 h-10 w-40 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink">
                  <option value="all">Все роли</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink">
                Смена бригады
                <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} className="mt-1.5 h-10 w-36 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink">
                  <option value="all">Все смены</option>
                  <option value="day">Дневная</option>
                  <option value="night">Ночная</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => showToast("Экспорт сформирован", "info")}
                className="ml-auto flex h-10 items-center gap-1.5 rounded-[10px] border border-border-strong px-3.5 text-xs font-semibold text-ink-secondary hover:bg-surface-2"
              >
                <DownloadIcon size={14} /> Экспорт
              </button>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl">
            <div className="table-scroll-x overflow-x-auto">
              <table className="w-full min-w-175 text-left">
                <thead className="bg-slate-50 text-[10px] font-semibold text-ink-muted">
                  <tr>
                    <th className="px-3 py-2.5">Сотрудник</th>
                    <th className="px-1">Роль</th>
                    <th className="px-1">Отработано</th>
                    <th className="px-1">Начислено</th>
                    <th className="px-1">Удержания</th>
                    <th className="px-1">К выплате</th>
                    <th className="px-1">Статус</th>
                    <th className="px-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((e) => (
                    <tr key={e.name} className="text-[11px] hover:bg-orange-50/40">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <PersonAvatar name={e.name} photo={e.photo} size={24} />
                          <span className="whitespace-nowrap font-semibold">{e.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-1 text-ink-secondary">{e.role}</td>
                      <td className="whitespace-nowrap px-1 text-ink-secondary">{e.days} дн.</td>
                      <td className="whitespace-nowrap px-1 text-ink-secondary">{e.accrued.toLocaleString("ru-RU")}</td>
                      <td className="whitespace-nowrap px-1 text-ink-secondary">{e.deductions.toLocaleString("ru-RU")}</td>
                      <td className="whitespace-nowrap px-1 font-semibold">{e.payout.toLocaleString("ru-RU")}</td>
                      <td className="whitespace-nowrap px-1">
                        <Badge color={STATUS_COLOR[e.status]}>
                          <span className="inline-flex items-center gap-1">
                            {e.status === "paid" && <CheckIcon size={10} />}
                            {STATUS_LABEL[e.status]}
                          </span>
                        </Badge>
                      </td>
                      <td className="relative px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenMenuFor((v) => (v === e.name ? null : e.name))}
                          aria-label="Действия"
                          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2"
                        >
                          <MoreIcon size={16} />
                        </button>
                        {openMenuFor === e.name && (
                          <div className="absolute right-3 top-9 z-10 w-44 rounded-xl border border-border bg-card p-1.5 text-left shadow-[var(--shadow-popover)]">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuFor(null);
                                showToast(`Открыта карточка: ${e.name}`, "info");
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-xs text-ink hover:bg-surface-2"
                            >
                              Открыть расчёт
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuFor(null);
                                showToast("Расчётный лист скачан", "info");
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-xs text-ink hover:bg-surface-2"
                            >
                              Скачать расчётный лист
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-ink-muted">Ничего не найдено</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[11px] text-ink-secondary">
              <span>Показано {visible.length} из {employees.length} сотрудников</span>
              <div className="flex gap-1">
                <button type="button" className="h-7 min-w-7 rounded-md border border-border-strong px-1.5 text-xs text-ink-secondary hover:bg-surface-2">‹</button>
                <button type="button" className="h-7 min-w-7 rounded-md border border-primary/50 bg-primary-soft px-1.5 text-xs font-semibold text-primary">1</button>
                <button type="button" className="h-7 min-w-7 rounded-md border border-border-strong px-1.5 text-xs text-ink-secondary hover:bg-surface-2">›</button>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-[15px] font-bold">Начисления по неделям</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_150px]">
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyAccrual} margin={{ top: 20, right: 4, left: -4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v: number) => (v === 0 ? "0" : `${v}M`)}
                      domain={[0, 15]}
                      ticks={[0, 5, 10, 15]}
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(30, 79, 122, 0.05)" }}
                      formatter={(v) => [`${v}M сум`, "Начислено"]}
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
                    <Bar dataKey="value" name="Начислено" fill="#1e4f7a" radius={[3, 3, 0, 0]} maxBarSize={44} {...chartAnim}>
                      <LabelList dataKey="value" content={<BarValueLabel />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center gap-2 rounded-xl border border-border p-3">
                <p className="text-[10px] text-ink-muted">За период</p>
                <b className="text-lg leading-tight">47 850 000 сум</b>
                <p className="mt-1 text-[10px] text-ink-muted">Изменение к прошлому периоду</p>
                <p className="flex items-center gap-1 text-sm font-bold text-green">↑ +8.6%</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Статусы выплат</h2>
            <div className="mt-3.5 flex items-center gap-3.5">
              <div className="relative h-[124px] w-[124px] shrink-0 rounded-full" style={{ background: donutGradient }}>
                <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-[22px] font-extrabold leading-none">10</p>
                  <p className="mt-1 text-[9px] text-ink-muted">Всего</p>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2 whitespace-nowrap text-[11.5px]">
                {statusBreakdown.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[s.key] }} />
                    {STATUS_LABEL[s.key]} <b className="ml-auto font-semibold">{s.count} ({s.pct}%)</b>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl">
            <CardHeader onMore={() => showToast("Действия с выплатами", "info")}>Ближайшие выплаты</CardHeader>
            <div className="divide-y divide-border px-5">
              {upcomingPayments.map((p) => (
                <div key={p.name} className="flex items-center gap-2.5 py-2.5">
                  <PersonAvatar name={p.name} photo={p.photo} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-bold">{p.name}</p>
                    <p className="truncate text-[10px] text-ink-muted">{p.role}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-bold">{formatSum(p.amount)}</p>
                    <p className="flex items-center justify-end gap-1 text-[10px] text-ink-muted">
                      <CalendarIcon size={11} /> {p.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => showToast("Открыт весь список выплат", "info")}
              className="flex w-full items-center justify-center gap-1 border-t border-border py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"
            >
              Смотреть все выплаты →
            </button>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Итоги за период</h2>
            <div className="mt-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between"><span className="text-ink-muted">Начислено</span><b className="font-semibold">47 850 000 сум</b></div>
              <div className="flex items-center justify-between"><span className="text-ink-muted">Удержания</span><b className="font-semibold">8 950 000 сум</b></div>
              <div className="flex items-center justify-between"><span className="text-ink-muted">К выплате</span><b className="font-semibold text-green">38 900 000 сум</b></div>
              <div className="flex items-center justify-between"><span className="text-ink-muted">Выплачено</span><b className="font-semibold">17 100 000 сум (30%)</b></div>
              <div className="flex items-center justify-between"><span className="text-ink-muted">Средний заработок</span><b className="font-semibold">4 785 000 сум</b></div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
