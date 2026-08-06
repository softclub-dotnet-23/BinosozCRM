import { useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import { cn } from "../utils/cn";
import {
  Badge,
  BoltIcon,
  CalendarIcon,
  Card,
  CardHeader,
  CheckIcon,
  ClipboardIcon,
  ClockIcon,
  FileIcon,
  HistoryIcon,
  HourglassIcon,
  KpiCard,
  PersonAvatar,
  PipeIcon,
  PlasterIcon,
  PlusIcon,
  TrowelIcon,
  UsersIcon,
  WindowIcon,
  tone,
} from "../components/brigadir/shared";

type WorkStatus = "in_progress" | "done" | "waiting";

const STATUS_LABEL: Record<WorkStatus, string> = {
  in_progress: "В процессе",
  done: "Выполнено",
  waiting: "Ожидает",
};
const STATUS_COLOR: Record<WorkStatus, string> = {
  in_progress: "blue",
  done: "green",
  waiting: "orange",
};

const works = [
  { id: "w1", title: "Кладка стен 2-го этажа", object: "ЖК «Сомони» • Секция А", dates: "16 - 18 июл", status: "in_progress" as WorkStatus, people: 5, color: "blue", icon: TrowelIcon },
  { id: "w2", title: "Монтаж трубопровода", object: "ЖК «Сомони» • Секция Б", dates: "16 - 20 июл", status: "in_progress" as WorkStatus, people: 4, color: "purple", icon: PipeIcon },
  { id: "w3", title: "Штукатурка стен", object: "ЖК «Сомони» • Секция А", dates: "19 - 21 июл", status: "waiting" as WorkStatus, people: 5, color: "green", icon: PlasterIcon },
  { id: "w4", title: "Установка окон", object: "ЖК «Сомони» • Секция А", dates: "10 - 12 июл", status: "done" as WorkStatus, people: 3, color: "blue", icon: WindowIcon },
  { id: "w5", title: "Электромонтаж", object: "ЖК «Сомони» • Секция Б", dates: "14 - 15 июл", status: "done" as WorkStatus, people: 3, color: "orange", icon: BoltIcon },
  { id: "w6", title: "Заливка отмостки", object: "ЖК «Сомони» • Секция Б", dates: "8 - 9 июл", status: "done" as WorkStatus, people: 4, color: "blue", icon: TrowelIcon },
  { id: "w7", title: "Демонтаж перегородок", object: "ЖК «Сомони» • Секция А", dates: "5 - 6 июл", status: "done" as WorkStatus, people: 2, color: "purple", icon: PipeIcon },
  { id: "w8", title: "Разводка электрики", object: "ЖК «Сомони» • Секция Б", dates: "2 - 4 июл", status: "done" as WorkStatus, people: 3, color: "orange", icon: BoltIcon },
];

const TABS: { key: "all" | WorkStatus; label: string; count: number }[] = [
  { key: "all", label: "Все", count: works.length },
  { key: "in_progress", label: STATUS_LABEL.in_progress, count: works.filter((w) => w.status === "in_progress").length },
  { key: "done", label: STATUS_LABEL.done, count: works.filter((w) => w.status === "done").length },
  { key: "waiting", label: STATUS_LABEL.waiting, count: works.filter((w) => w.status === "waiting").length },
];

const todaySchedule = [
  { time: "08:00", title: "Кладка стен 2-го этажа", object: "ЖК «Сомони» • Секция А", status: "in_progress" as WorkStatus },
  { time: "11:00", title: "Монтаж трубопровода", object: "ЖК «Сомони» • Секция Б", status: "in_progress" as WorkStatus },
  { time: "13:00", title: "Штукатурка стен", object: "ЖК «Сомони» • Секция А", status: "waiting" as WorkStatus },
];

const crew = [
  { name: "Абдуллоев Олим", position: "Арматурщик", grade: "5 разряд", load: 100, assigned: 3 },
  { name: "Исмоилов Рустам", position: "Плотник", grade: "4 разряд", load: 80, assigned: 2 },
  { name: "Мирзоев Бахтиёр", position: "Бетонщик", grade: "4 разряд", load: 60, assigned: 1 },
  { name: "Курбонов Фаррух", position: "Монтажник", grade: "4 разряд", load: 80, assigned: 2 },
  { name: "Назаров Шероз", position: "Сварщик", grade: "5 разряд", load: 40, assigned: 1 },
];

const STEPS = ["Выбор работы", "Исполнители", "Параметры", "Подтверждение"];

const quickActions = [
  { label: "План работ", icon: ClipboardIcon, color: "blue" },
  { label: "Добавить работу", icon: PlusIcon, color: "green" },
  { label: "Шаблоны работ", icon: FileIcon, color: "purple" },
  { label: "История назначений", icon: HistoryIcon, color: "orange" },
];

function loadBarColor(load: number): string {
  if (load >= 90) return "bg-red";
  if (load >= 70) return "bg-warning";
  return "bg-blue";
}

const CARD_RADIUS = "rounded-2xl";
const inputBase = "h-8 w-full rounded-lg border border-border-strong bg-card px-2.5 text-[11px] text-ink";

export default function BrigadirAssignmentsPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | WorkStatus>("all");
  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [description, setDescription] = useState("");
  const [objectFilter, setObjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const searched = works.filter((w) => `${w.title} ${w.object}`.toLowerCase().includes(search.toLowerCase()));
  const filteredWorks = tab === "all" ? searched : searched.filter((w) => w.status === tab);
  const visibleWorks = tab === "all" && !expanded ? filteredWorks.slice(0, 5) : filteredWorks;
  const hiddenCount = filteredWorks.length - visibleWorks.length;
  const visibleCrew = crew.filter((m) => `${m.name} ${m.position}`.toLowerCase().includes(search.toLowerCase()));

  function resetFilters() {
    setObjectFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  return (
    <AppLayout
      title="Назначение работ"
      subtitle="Планирование и назначение работ для бригады"
      titleBelowHeader
      contentMaxWidth="1280px"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск по объектам, работам..." }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <KpiCard label="Назначено работ" value="8" note="на этот период" color="blue" icon={ClipboardIcon} trend="2 к прошлому периоду" trendIcon="up" trendColor="green" />
        <KpiCard label="Выполнено" value="5" note="работ" color="green" icon={CheckIcon} trend="62.5% от назначенных" trendIcon="up" trendColor="green" />
        <KpiCard label="В процессе" value="2" note="работы" color="orange" icon={ClockIcon} trend="25% от назначенных" trendIcon="down" trendColor="orange" />
        <KpiCard label="Ожидает" value="1" note="работа" color="purple" icon={HourglassIcon} trend="12.5% от назначенных" trendIcon="down" trendColor="purple" />
      </div>

      <Card className={cn("mt-4 p-4", CARD_RADIUS)}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-10 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink-secondary">
            <CalendarIcon size={14} className="text-ink-muted" />
            Период: 01.07.2026 - 31.07.2026
          </div>
          <select value={objectFilter} onChange={(e) => setObjectFilter(e.target.value)} className="h-10 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink">
            <option value="all">Все объекты</option>
            <option value="a">ЖК «Сомони» • Секция А</option>
            <option value="b">ЖК «Сомони» • Секция Б</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink">
            <option value="all">Все типы</option>
            <option value="wall">Кладочные работы</option>
            <option value="plumb">Сантехнические работы</option>
            <option value="electric">Электромонтажные работы</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink">
            <option value="all">Все статусы</option>
            <option value="in_progress">В процессе</option>
            <option value="done">Выполнено</option>
            <option value="waiting">Ожидает</option>
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="flex h-10 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-xs font-semibold text-ink-secondary hover:bg-surface-2"
          >
            ↺ Сбросить
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("assignment-form")?.scrollIntoView({ behavior: "smooth" })}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-xs font-bold text-white hover:bg-primary-hover"
          >
            <PlusIcon size={14} /> Назначить работу
          </button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1.38fr)_minmax(0,0.98fr)_minmax(280px,0.84fr)]">
        <Card className={cn("overflow-hidden", CARD_RADIUS)}>
          <CardHeader onMore={() => showToast("Действия со списком работ", "info")}>Список назначенных работ</CardHeader>
          <div className="flex flex-nowrap items-center gap-1 overflow-x-auto border-b border-border px-5 pt-3">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setExpanded(false);
                }}
                className={cn(
                  "relative shrink-0 whitespace-nowrap px-2 pb-2.5 text-[11px] font-semibold transition-colors",
                  tab === t.key ? "text-primary" : "text-ink-secondary hover:text-ink",
                )}
              >
                {t.label} ({t.count})
                {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
          <div className="max-h-[380px] divide-y divide-border overflow-y-auto px-3">
            {visibleWorks.map((w) => (
              <button
                type="button"
                key={w.id}
                onClick={() => showToast(`${w.title} — карточка открыта`, "info")}
                className="flex w-full items-center gap-3 py-3 text-left hover:bg-orange-50/40"
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tone[w.color])}>
                  <w.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold">{w.title}</p>
                  <p className="truncate text-[10.5px] text-ink-muted">{w.object}</p>
                  <p className="text-[10.5px] text-ink-muted">{w.dates}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge color={STATUS_COLOR[w.status]}>{STATUS_LABEL[w.status]}</Badge>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-secondary">
                    <UsersIcon size={11} /> {w.people}
                  </span>
                </div>
              </button>
            ))}
            {visibleWorks.length === 0 && <p className="py-6 text-center text-xs text-ink-muted">Ничего не найдено</p>}
          </div>
          {tab === "all" && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex w-full items-center justify-center gap-1 border-t border-border bg-white py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"
            >
              Показать ещё {hiddenCount} работы ↓
            </button>
          )}
          {tab === "all" && expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex w-full items-center justify-center gap-1 border-t border-border bg-white py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"
            >
              Показать меньше ↑
            </button>
          )}
        </Card>

        <Card id="assignment-form" className={cn("overflow-hidden p-3.5", CARD_RADIUS)}>
          <h2 className="text-[14px] font-bold">Назначить новую работу</h2>
          <div className="mt-2 flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold",
                      i === 0 ? "bg-primary text-white" : "bg-surface-3 text-ink-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("whitespace-nowrap text-[8px] font-semibold", i === 0 ? "text-primary" : "text-ink-muted")}>{step}</span>
                </div>
                {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-border-strong" />}
              </div>
            ))}
          </div>

          <div className="mt-2.5 space-y-2">
            <label className="block text-[11px] font-semibold text-ink">
              Объект *
              <select defaultValue="" className={cn("mt-1", inputBase, "text-ink-secondary")}>
                <option value="" disabled>Выберите объект</option>
                <option value="a">ЖК «Сомони» • Секция А</option>
                <option value="b">ЖК «Сомони» • Секция Б</option>
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-ink">
              Работа / Вид работ *
              <select defaultValue="" className={cn("mt-1", inputBase, "text-ink-secondary")}>
                <option value="" disabled>Выберите работу</option>
                <option value="wall">Кладка стен</option>
                <option value="plumb">Монтаж трубопровода</option>
                <option value="plaster">Штукатурка стен</option>
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-ink">
              Тип работы
              <select defaultValue="" className={cn("mt-1", inputBase, "text-ink-secondary")}>
                <option value="" disabled>Выберите тип работы</option>
                <option value="main">Основные работы</option>
                <option value="finish">Отделочные работы</option>
              </select>
            </label>

            <div>
              <p className="text-[11px] font-semibold text-ink">Планируемые даты</p>
              <div className="mt-0.5 grid grid-cols-2 gap-2">
                <label className="block text-[11px] text-ink-secondary">
                  Начало *
                  <input type="date" className={cn("mt-0.5", inputBase)} />
                </label>
                <label className="block text-[11px] text-ink-secondary">
                  Окончание *
                  <input type="date" className={cn("mt-0.5", inputBase)} />
                </label>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-ink">Приоритет</p>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(
                  [
                    ["low", "Низкий"],
                    ["medium", "Средний"],
                    ["high", "Высокий"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key)}
                    className={cn(
                      "h-8 rounded-lg border text-[10px] font-semibold transition-colors",
                      priority === key ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-ink-secondary hover:bg-surface-2",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-[11px] font-semibold text-ink">
              Описание / Примечание
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                rows={2}
                placeholder="Введите описание работы или дополнительные указания..."
                className="mt-0.5 h-[38px] w-full resize-none rounded-lg border border-border-strong bg-card px-2.5 py-1.5 text-[11px] text-ink placeholder:text-ink-muted"
              />
              <span className="mt-0.5 block text-right text-[9px] text-ink-muted">{description.length}/300</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => showToast("Переход к шагу «Исполнители» — форма в разработке", "info")}
            className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-bold text-white hover:bg-primary-hover"
          >
            Далее →
          </button>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:row-span-2">
          <Card className={cn("p-5", CARD_RADIUS)}>
            <h2 className="text-[14px] font-bold">Загрузка бригады</h2>
            <div className="mt-3.5 flex items-center gap-3.5">
              <div
                className="relative h-[118px] w-[118px] shrink-0 rounded-full"
                style={{ background: "conic-gradient(#e83939 0 35%, #f58a1f 35% 55%, #22a447 55% 70%, #cbd5e1 70% 100%)" }}
              >
                <div className="absolute inset-[15px] flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-[20px] font-extrabold leading-none">73%</p>
                  <p className="mt-1 text-[9px] text-ink-muted">Загруженность</p>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2 whitespace-nowrap text-[11.5px]">
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-sm bg-red" /> Высокая <b className="ml-auto font-semibold">5 работ</b>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-sm bg-warning" /> Средняя <b className="ml-auto font-semibold">2 работы</b>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-sm bg-green" /> Низкая <b className="ml-auto font-semibold">1 работа</b>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-sm bg-slate-300" /> Свободна <b className="ml-auto font-semibold">2 человека</b>
                </li>
              </ul>
            </div>
          </Card>

          <Card className={cn("overflow-hidden", CARD_RADIUS)}>
            <CardHeader onMore={() => showToast("Открыт полный календарь", "info")}>Календарь работ</CardHeader>
            <p className="px-5 pt-3 text-[11px] font-semibold text-ink-muted">Сегодня, 16 июля</p>
            <div className="mt-1.5 divide-y divide-border px-5">
              {todaySchedule.map((row) => (
                <div key={row.time + row.title} className="flex items-center gap-2.5 py-2.5">
                  <span className="w-9 shrink-0 text-[11px] font-bold text-ink-secondary">{row.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold">{row.title}</p>
                    <p className="truncate text-[9.5px] text-ink-muted">{row.object}</p>
                  </div>
                  <Badge color={STATUS_COLOR[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => showToast("Открыт полный календарь", "info")}
              className="flex w-full items-center justify-center gap-1 border-t border-border py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"
            >
              Полный календарь →
            </button>
          </Card>

          <Card className={cn("mt-[60px] min-h-[370px] w-[calc(100%+8px)] p-5", CARD_RADIUS)}>
            <h2 className="text-[14px] font-bold">Быстрые действия</h2>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => showToast(`${a.label} — функция в разработке`, "info")}
                  className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-xl border border-border p-3 text-center hover:bg-surface-1"
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone[a.color])}>
                    <a.icon size={16} />
                  </span>
                  <span className="text-[10.5px] font-semibold leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

      <Card className={cn("mt-4 overflow-hidden md:col-[1/3]", CARD_RADIUS)}>
        <CardHeader onMore={() => showToast("Действия с исполнителями бригады", "info")}>Исполнители бригады</CardHeader>
        <div className="table-scroll-x overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-semibold text-ink-muted">
                <th className="whitespace-nowrap px-5 py-3">Сотрудник</th>
                <th className="whitespace-nowrap px-2">Должность</th>
                <th className="whitespace-nowrap px-2">Квалификация</th>
                <th className="whitespace-nowrap px-2">Занятость</th>
                <th className="whitespace-nowrap px-5">Назначено работ</th>
              </tr>
            </thead>
            <tbody>
              {visibleCrew.map((m) => (
                <tr key={m.name} className="border-t border-border hover:bg-orange-50/40">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <PersonAvatar name={m.name} size={28} />
                      <span className="whitespace-nowrap text-[12px] font-semibold">{m.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 text-[11px] text-ink-secondary">{m.position}</td>
                  <td className="whitespace-nowrap px-2 text-[11px] text-ink-secondary">{m.grade}</td>
                  <td className="px-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div className={cn("h-full rounded-full", loadBarColor(m.load))} style={{ width: `${m.load}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-ink-secondary">{m.load}%</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 text-[11px] text-ink-secondary">
                    {m.assigned} {m.assigned === 1 ? "работа" : "работы"}
                  </td>
                </tr>
              ))}
              {visibleCrew.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-ink-muted">Ничего не найдено</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => showToast("Открыт весь список сотрудников", "info")}
          className="flex w-full items-center justify-center gap-1 border-t border-border py-3 text-[11px] font-bold text-primary hover:bg-primary-soft"
        >
          Показать всех сотрудников →
        </button>
      </Card>
      </div>
    </AppLayout>
  );
}
