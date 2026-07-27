import { useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useToast } from "../hooks/useToast";
import { cn } from "../utils/cn";
import {
  BoxIcon,
  BriefcaseIcon,
  CameraIcon,
  Card,
  CheckIcon,
  ClipboardIcon,
  ExternalLinkIcon,
  FileIcon,
  MailIcon,
  PencilIcon,
  PersonAvatar,
  PhoneIcon,
  tone,
  UsersIcon,
} from "../components/brigadir/shared";

const IDENTITY = {
  name: "Комрон Саидов",
  role: "Бригадир",
  photo: "komron-saidov.jpg",
  phone: "+992 93 456 78 90",
  email: "komron.saidov@binosoz.tj",
};

const kpis = [
  { label: "Стаж", value: "6 лет", color: "blue", icon: BriefcaseIcon },
  { label: "Бригада", value: "12 сотрудников", color: "green", icon: UsersIcon },
  { label: "Активные задачи", value: "5", color: "orange", icon: ClipboardIcon },
  { label: "Средняя явка", value: "92%", color: "green", icon: CheckIcon },
];

const personalInfo = [
  ["Дата рождения", "15.03.1988"],
  ["Адрес", "г. Душанбе, ул. Н. Карабаева, 45"],
  ["Паспорт/ID", "AB 1234567"],
  ["Дата найма", "01.02.2021"],
  ["Объект", "ЖК «Сомон Плаза»"],
  ["Прораб", "Комрон Саидов"],
] as const;

const professionalInfo = [
  ["Специализация", "Монолитные работы"],
  ["Разряд", "5 разряд"],
  ["Опыт в строительстве", "11 лет"],
  ["Количество завершённых объектов", "18"],
  ["Текущий объект", "ЖК «Сомон Плаза»"],
  ["Подчинённых", "12 сотрудников"],
  ["Следующая аттестация", "15.02.2027"],
] as const;

const skills = [
  { label: "Монолитные работы", icon: BriefcaseIcon },
  { label: "Организация бригады", icon: UsersIcon },
  { label: "Контроль качества", icon: CheckIcon },
  { label: "Техника безопасности", icon: CheckIcon },
  { label: "Смета материалов", icon: ClipboardIcon },
  { label: "Отчётность", icon: FileIcon },
] as const;

const documents = [
  { label: "Удостоверение", status: "Загружено", color: "blue", icon: FileIcon },
  { label: "Договор", status: "Действует до 31.12.2026", color: "green", icon: FileIcon },
  { label: "Аттестация", status: "Действует до 15.02.2027", color: "orange", icon: FileIcon },
] as const;

const statsLegend = [
  { label: "Завершено задач", value: "78 (61%)", color: "blue", pct: 61 },
  { label: "Средняя явка", value: "92%", color: "green", pct: 20 },
  { label: "Запросы материалов", value: "24 (19%)", color: "orange", pct: 19 },
];

const STATS_HEX: Record<string, string> = { blue: "#3b82f6", green: "#22c55e", orange: "#f59e0b" };

const activity = [
  { icon: CheckIcon, color: "green", text: "Отметил посещаемость бригады", time: "Сегодня, 08:15" },
  { icon: ClipboardIcon, color: "orange", text: "Обновил статус задачи", time: "Вчера, 17:42" },
  { icon: BoxIcon, color: "blue", text: "Запросил материалы: Арматура Ø12", time: "Вчера, 14:08" },
  { icon: FileIcon, color: "purple", text: "Отправил отчёт по работам", time: "29 июл, 18:35" },
] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
        checked ? "justify-end bg-primary" : "justify-start bg-surface-3",
      )}
    >
      <span className="h-4 w-4 rounded-full bg-white shadow" />
    </button>
  );
}

export default function BrigadirProfilePage() {
  const { showToast } = useToast();
  const [toggles, setToggles] = useState({
    notifications: true,
    sms: true,
    telegram: true,
    visibility: true,
  });

  const donutGradient = (() => {
    let acc = 0;
    const stops = statsLegend.map((s) => {
      const start = acc;
      acc += s.pct;
      return `${STATS_HEX[s.color]} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  })();

  return (
    <AppLayout
      title="Профиль"
      subtitle="Личные данные, настройки и информация о бригадире"
      titleBelowHeader
      contentMaxWidth="1280px"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", tone[k.color])}>
                <k.icon size={20} />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-ink-secondary">{k.label}</p>
                <p className="mt-1 text-[20px] font-extrabold leading-tight">{k.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="rounded-2xl p-5">
            <div className="flex flex-col items-center text-center">
              <PersonAvatar name={IDENTITY.name} photo={IDENTITY.photo} size={88} />
              <p className="mt-3 text-base font-bold">{IDENTITY.name}</p>
              <p className="text-xs text-ink-muted">{IDENTITY.role}</p>
              <div className="mt-3 w-full space-y-1.5 text-left text-xs text-ink-secondary">
                <p className="flex items-center gap-2"><PhoneIcon size={13} className="text-ink-muted" /> {IDENTITY.phone}</p>
                <p className="flex items-center gap-2"><MailIcon size={13} className="text-ink-muted" /> {IDENTITY.email}</p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-green-soft px-2 py-1 text-[10px] font-bold text-green">
                <span className="h-1.5 w-1.5 rounded-full bg-green" /> Активен
              </span>
              <button
                type="button"
                onClick={() => showToast("Редактирование профиля — функция в разработке", "info")}
                className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-primary text-xs font-bold text-white hover:bg-primary-hover"
              >
                <PencilIcon size={14} /> Редактировать профиль
              </button>
              <button
                type="button"
                onClick={() => showToast("Загрузка фото — функция в разработке", "info")}
                className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-primary/50 text-xs font-bold text-primary hover:bg-primary hover:text-white"
              >
                <CameraIcon size={14} /> Изменить фото
              </button>
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Личная информация</h2>
            <div className="mt-3 space-y-2.5 text-xs">
              {personalInfo.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">{label}</span>
                  <b className="text-right font-semibold">{value}</b>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Профессиональная информация</h2>
            <div className="mt-3 space-y-2.5 text-xs">
              {professionalInfo.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">{label}</span>
                  <b className="text-right font-semibold">{value}</b>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Навыки</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s.label}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-ink-secondary"
                >
                  <s.icon size={13} className="text-primary" /> {s.label}
                </span>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Документы и доступ</h2>
            <div className="mt-3 space-y-2.5">
              {documents.map((d) => (
                <div key={d.label} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone[d.color])}>
                    <d.icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-bold">{d.label}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold text-green">
                      <CheckIcon size={11} className="shrink-0" /> {d.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast(`${d.label} открыт`, "info")}
                    className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border-strong px-2.5 text-[10.5px] font-semibold text-ink-secondary hover:bg-surface-2"
                  >
                    Открыть <ExternalLinkIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Статистика профиля</h2>
            <div className="mt-3.5 flex items-center gap-3.5">
              <div className="relative h-26 w-26 shrink-0 rounded-full" style={{ background: donutGradient }}>
                <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-[19px] font-extrabold leading-none">128</p>
                  <p className="mt-1 text-[8.5px] text-ink-muted">всего задач</p>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2 text-[10.5px]">
                {statsLegend.map((s) => (
                  <li key={s.label} className="flex items-start gap-1.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATS_HEX[s.color] }} />
                    <span className="min-w-0 flex-1 leading-tight">{s.label}</span>
                    <b className="shrink-0 font-semibold">{s.value}</b>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Последняя активность</h2>
            <div className="mt-3 divide-y divide-border">
              {activity.map((a) => (
                <div key={a.text} className="flex items-center gap-2.5 py-2.5">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone[a.color])}>
                    <a.icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-semibold">{a.text}</p>
                    <p className="text-[10px] text-ink-muted">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-[14px] font-bold">Настройки</h2>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Уведомления</span>
                <Toggle checked={toggles.notifications} onChange={() => setToggles((t) => ({ ...t, notifications: !t.notifications }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">SMS-оповещения</span>
                <Toggle checked={toggles.sms} onChange={() => setToggles((t) => ({ ...t, sms: !t.sms }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Telegram-оповещения</span>
                <Toggle checked={toggles.telegram} onChange={() => setToggles((t) => ({ ...t, telegram: !t.telegram }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Доступность профиля</span>
                <Toggle checked={toggles.visibility} onChange={() => setToggles((t) => ({ ...t, visibility: !t.visibility }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Язык интерфейса</span>
                <select
                  defaultValue="ru"
                  onChange={() => showToast("Язык интерфейса обновлён", "info")}
                  className="h-8 rounded-lg border border-border-strong bg-card px-2 text-xs text-ink"
                >
                  <option value="ru">Русский</option>
                  <option value="tg">Тоҷикӣ</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
