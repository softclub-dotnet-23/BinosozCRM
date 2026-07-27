import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, ChevronDown, LogOut, Menu, Settings, User as UserIcon } from "lucide-react";
import { SearchInput } from "../ui/SearchInput";
import { SessionAvatar } from "./SessionAvatar";
import { ProfileModal } from "./ProfileModal";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { materialsRepository } from "../../data/repositories";
import { getMaterialStatus } from "../../utils/materialAnalytics";
import { readJson } from "../../lib/storage/localStorageEngine";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

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
  compact?: boolean;
}

export function Header({ title, subtitle, onOpenMobileSidebar, search, action, compact = false }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { strings } = useLanguage();
  const [notifOpen, setNotifOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [localSearch, setLocalSearch] = useState("");
  const selectedRange = strings.header.dateRanges[selectedRangeIndex];

  const notifRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const materials = useRepositorySnapshot(materialsRepository);
  const criticalCount = useMemo(() => materials.filter((m) => getMaterialStatus(m) === "critical").length, [materials]);

  const notifications = useMemo(() => {
    // Real, persisted "Сроки и просрочки" / "Критические остатки" toggles (Settings → Notifications)
    // — turning one off actually removes that notification type from the bell, not just cosmetically.
    const settings = readJson<{ deadlineNotifications?: boolean; stockNotifications?: boolean }>("app.settings.v1");
    const deadlineNotifications = settings?.deadlineNotifications ?? true;
    const stockNotifications = settings?.stockNotifications ?? true;

    const list: { id: number; title: string; time: string }[] = [];
    if (deadlineNotifications) list.push({ id: 1, title: strings.header.demoNotificationOverdue, time: strings.header.minutesAgo(10) });
    if (stockNotifications && criticalCount > 0) {
      list.push({ id: 2, title: strings.header.criticalMaterialsNotification(criticalCount), time: strings.header.justNow });
    }
    list.push({ id: 3, title: strings.header.demoNotificationPayroll, time: strings.header.hoursAgo(3) });
    return list;
  }, [criticalCount, strings]);

  useOnClickOutside(notifRef, () => setNotifOpen(false));
  useOnClickOutside(dateRef, () => setDateOpen(false));
  useOnClickOutside(profileRef, () => setProfileOpen(false));

  return (
    <header className="sticky top-0 z-30 flex min-h-[70px] flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-5 py-3 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={strings.header.openMenu}
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-ink-secondary hover:bg-surface-3 lg:hidden"
        >
          <Menu size={20} />
        </button>
        {!compact && (
          <div>
            <h1 className="text-2xl font-bold leading-tight text-ink">{title}</h1>
            <p className="text-sm text-ink-secondary">{subtitle}</p>
          </div>
        )}
      </div>

      <div className={cn("flex flex-1 items-center gap-3", compact ? "w-full justify-between" : "justify-end")}>
        <SearchInput
          value={search ? search.value : localSearch}
          onChange={(e) => (search ? search.onChange(e.target.value) : setLocalSearch(e.target.value))}
          placeholder={search?.placeholder ?? strings.header.searchPlaceholder}
          containerClassName={compact ? "min-w-[180px] max-w-[360px] flex-1" : "hidden min-w-[220px] max-w-xs flex-1 md:block"}
          aria-label={strings.header.searchPlaceholder}
        />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label={strings.header.notifications}
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border-strong text-ink-secondary transition-colors hover:bg-surface-3"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red text-[10px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-popover)]">
              <p className="px-3 py-2 text-sm font-bold text-ink">{strings.header.notifications}</p>
              <div className="space-y-1">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg px-3 py-2 hover:bg-surface-2">
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
            className="flex h-10 items-center gap-2 rounded-[10px] border border-border-strong px-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface-3"
          >
            <CalendarDays size={16} className="text-ink-secondary" />
            <span className="hidden sm:inline">{selectedRange}</span>
            <ChevronDown size={14} className="text-ink-muted" />
          </button>
          {dateOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]">
              {strings.header.dateRanges.map((range, index) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => {
                    setSelectedRangeIndex(index);
                    setDateOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2",
                    index === selectedRangeIndex ? "font-semibold text-primary" : "text-ink",
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>

        {user && (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 hover:bg-surface-3"
            >
              <SessionAvatar user={user} className="h-9 w-9" />
              <ChevronDown size={14} className="text-ink-muted" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{user.fullName}</p>
                  <p className="text-xs text-ink-muted">{strings.common.roleLabels[user.role]}</p>
                </div>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-2"
                >
                  <UserIcon size={15} /> {strings.header.profile}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-2"
                >
                  <Settings size={15} /> {strings.header.settings}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red hover:bg-red-soft"
                >
                  <LogOut size={15} /> {strings.header.logout}
                </button>
              </div>
            )}
          </div>
        )}

        {action}
      </div>

      {user && <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} user={user} />}
    </header>
  );
}
