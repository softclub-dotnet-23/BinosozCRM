import { useRef, useState, type ReactNode } from "react";
import { Bell, CalendarDays, ChevronDown, LogOut, Menu, Settings, User as UserIcon } from "lucide-react";
import { SearchInput } from "../ui/SearchInput";
import { OwnerAvatar } from "../ui/OwnerAvatar";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { cn } from "../../utils/cn";

interface HeaderProps {
  title: string;
  subtitle: string;
  onOpenMobileSidebar: () => void;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  action?: ReactNode;
}

const NOTIFICATIONS = [
  { id: 1, title: "Заливка фундамента просрочена", time: "10 мин назад" },
  { id: 2, title: "Остаток отделочных материалов ниже минимума", time: "1 ч назад" },
  { id: 3, title: "Зарплата за июль готова к утверждению", time: "3 ч назад" },
];

const DATE_RANGES = ["1 – 30 июль 2026", "1 – 30 июнь 2026", "1 – 31 май 2026", "Текущий квартал"];

export function Header({ title, subtitle, onOpenMobileSidebar, search, action }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(DATE_RANGES[0]);
  const [localSearch, setLocalSearch] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(notifRef, () => setNotifOpen(false));
  useOnClickOutside(dateRef, () => setDateOpen(false));
  useOnClickOutside(profileRef, () => setProfileOpen(false));

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/70 px-5 py-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Открыть меню"
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-ink-secondary hover:bg-[#F5F5F4] lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">{title}</h1>
          <p className="text-sm text-ink-secondary">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <SearchInput
          value={search ? search.value : localSearch}
          onChange={(e) => (search ? search.onChange(e.target.value) : setLocalSearch(e.target.value))}
          placeholder={search?.placeholder ?? "Поиск..."}
          containerClassName="hidden min-w-[220px] max-w-xs flex-1 md:block"
          aria-label="Поиск"
        />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Уведомления"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4]"
          >
            <Bell size={18} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red text-[10px] font-bold text-white">
              3
            </span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-popover)]">
              <p className="px-3 py-2 text-sm font-bold text-ink">Уведомления</p>
              <div className="space-y-1">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="rounded-lg px-3 py-2 hover:bg-[#F7F7F6]">
                    <p className="text-sm text-ink">{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dateRef}>
          <button
            type="button"
            onClick={() => setDateOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-[10px] border border-border-strong px-3.5 text-sm font-medium text-ink transition-colors hover:bg-[#F5F5F4]"
          >
            <CalendarDays size={16} className="text-ink-secondary" />
            <span className="hidden sm:inline">{selectedRange}</span>
            <ChevronDown size={14} className="text-ink-muted" />
          </button>
          {dateOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]">
              {DATE_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => {
                    setSelectedRange(range);
                    setDateOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F7F7F6]",
                    range === selectedRange ? "font-semibold text-primary" : "text-ink",
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 hover:bg-[#F5F5F4]"
          >
            <OwnerAvatar className="h-9 w-9" />
            <ChevronDown size={14} className="text-ink-muted" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-ink">Садди Имомов</p>
                <p className="text-xs text-ink-muted">Владелец</p>
              </div>
              <div className="my-1 border-t border-border" />
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-[#F7F7F6]">
                <UserIcon size={15} /> Профиль
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-[#F7F7F6]">
                <Settings size={15} /> Настройки
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red hover:bg-red-soft">
                <LogOut size={15} /> Выйти
              </button>
            </div>
          )}
        </div>

        {action}
      </div>
    </header>
  );
}
