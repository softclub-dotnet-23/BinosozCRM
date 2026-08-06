import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, Settings, User as UserIcon } from "lucide-react";
import { SearchInput } from "../ui/SearchInput";
import { SessionAvatar } from "./SessionAvatar";
import { ProfileModal } from "./ProfileModal";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  useOnClickOutside(notifRef, () => setNotifOpen(false));
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
          containerClassName={compact ? "min-w-0 sm:min-w-[180px] max-w-[360px] flex-1" : "hidden min-w-[220px] max-w-xs flex-1 md:block"}
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
          </button>
          {notifOpen && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-popover)]">
              <p className="px-3 py-2 text-sm font-bold text-ink">{strings.header.notifications}</p>
              <p className="px-3 py-4 text-center text-sm text-ink-muted">Нет новых уведомлений</p>
            </div>
          )}
        </div>

        {user && (
          <div className="relative hidden md:block" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-label={strings.header.profile}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-surface-3"
            >
              <SessionAvatar user={user} className="h-11 w-11" />
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
