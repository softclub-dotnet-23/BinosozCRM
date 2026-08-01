import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  HardHat,
  Home,
  LogOut,
  Package,
  Settings,
  User,
  Users,
  Wallet,
  BarChart3,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { SessionAvatar } from "./SessionAvatar";
import { MobileProfileCard } from "./MobileProfileCard";
import { useAuth } from "../../context/AuthContext";
import { isRouteAllowed, ROLE_LABEL } from "../../lib/auth/roleAccess";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

interface NavGroup {
  label: string;
  icon: typeof Home;
  children: { to: string; label: string }[];
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV_ITEMS: NavEntry[] = [
  { to: "/dashboard", label: "Обзор", icon: Home },
  { to: "/objects", label: "Объекты", icon: Building2 },
  { to: "/works", label: "Работы", icon: ClipboardCheck },
  {
    label: "Бригады",
    icon: HardHat,
    children: [
      { to: "/brigades", label: "Список бригад" },
      { to: "/brigades/composition", label: "Состав бригад" },
    ],
  },
  { to: "/employees", label: "Сотрудники", icon: User },
  { to: "/attendance", label: "Посещаемость", icon: Calendar },
  {
    label: "Склад и материалы",
    icon: Package,
    children: [
      { to: "/inventory/material-requests", label: "Заявки на материалы" },
      { to: "/inventory/receipts", label: "Поступления" },
      { to: "/inventory/write-offs", label: "Списания" },
    ],
  },
  { to: "/payroll", label: "Зарплаты", icon: Wallet },
  { to: "/reports", label: "Отчёты", icon: BarChart3 },
  { to: "/users", label: "Пользователи", icon: Users },
  { to: "/settings", label: "Настройки", icon: Settings },
];

const BRIGADIR_NAV_ITEMS: NavEntry[] = [
  { to: "/dashboard", label: "Обзор", icon: Home },
  { to: "/brigades", label: "Моя бригада", icon: Users },
  { to: "/works", label: "Назначенные работы", icon: ClipboardCheck },
  { to: "/attendance", label: "Посещаемость", icon: Calendar },
  { to: "/inventory/material-requests", label: "Материалы", icon: Package },
];

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ collapsed = false, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const navRef = useRef<HTMLElement>(null);

  const visibleNavItems = useMemo(
    () =>
      user
        ? (user.role === "brigadir" ? BRIGADIR_NAV_ITEMS : NAV_ITEMS).map((entry) =>
            isNavGroup(entry) ? { ...entry, children: entry.children.filter((c) => isRouteAllowed(user.role, c.to)) } : entry,
          ).filter((entry) => (isNavGroup(entry) ? entry.children.length > 0 : isRouteAllowed(user.role, entry.to)))
        : [],
    [user],
  );

  useEffect(() => {
    visibleNavItems.forEach((entry) => {
      if (isNavGroup(entry) && entry.children.some((c) => location.pathname.startsWith(c.to))) {
        setExpandedGroups((prev) => (prev.has(entry.label) ? prev : new Set(prev).add(entry.label)));
      }
    });
  }, [location.pathname, visibleNavItems]);

  // Keep the active item (and its expanded group) in view when the sidebar's own list is taller
  // than the viewport — otherwise navigating can leave the active link scrolled out of sight.
  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [location.pathname, expandedGroups]);

  // The mobile drawer's backdrop and X button already close it; Escape didn't — bring the mobile
  // sidebar drawer in line with the Escape-closes convention Modal/Drawer already use elsewhere.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseMobile?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        // data-sidebar-state reflects this component's own collapsed prop
        // directly — settings.css/users.css key off it instead of matching
        // the literal "w-[236px]" Tailwind class string below, which would
        // silently stop matching if that arbitrary value ever changes.
        data-sidebar-state={collapsed ? "collapsed" : "expanded"}
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-[width,transform] duration-200",
          collapsed ? "w-[84px]" : "w-[236px]",
          "fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-6">
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            {collapsed ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                <img
                  src="/images/binosoz-mark.svg"
                  alt="BINOSOZ Construction Management CRM"
                  className="h-6 w-6 object-contain"
                />
              </div>
            ) : (
              <img
                src="/images/binosoz-logo.svg"
                alt="BINOSOZ Construction Management CRM"
                className="h-11 max-w-full object-contain"
              />
            )}
          </div>
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-[#F5F5F4] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav ref={navRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {visibleNavItems.map((entry) => {
            if (isNavGroup(entry)) {
              const isGroupActive = entry.children.some((c) => location.pathname.startsWith(c.to));
              const isExpanded = expandedGroups.has(entry.label);

              if (collapsed) {
                return (
                  <Link
                    key={entry.label}
                    to={entry.children[0].to}
                    title={entry.label}
                    className={cn(
                      "relative flex items-center justify-center rounded-lg px-0 py-2.5 text-sm font-medium transition-colors duration-150",
                      isGroupActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-[#F7F7F6] hover:text-ink",
                    )}
                  >
                    <entry.icon size={18} className="shrink-0" />
                  </Link>
                );
              }

              return (
                <div key={entry.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(entry.label)}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                      isGroupActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-[#F7F7F6] hover:text-ink",
                    )}
                  >
                    {isGroupActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <entry.icon size={18} className="shrink-0" />
                    <span className="flex-1 truncate text-left">{entry.label}</span>
                    <ChevronDown
                      size={15}
                      className={cn("shrink-0 transition-transform duration-150", isExpanded && "rotate-180")}
                    />
                  </button>
                  {isExpanded && (
                    <div className="mt-0.5 space-y-0.5 pl-[34px]">
                      {entry.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          onClick={onCloseMobile}
                          className={({ isActive }) =>
                            cn(
                              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                              isActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-[#F7F7F6] hover:text-ink",
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                    isActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-[#F7F7F6] hover:text-ink",
                    collapsed && "justify-center px-0",
                  )
                }
                title={collapsed ? entry.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <entry.icon size={18} className="shrink-0" />
                    {!collapsed && <span className="truncate">{entry.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {user && (
          <div className="hidden border-t border-border p-4 lg:block">
            <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              <SessionAvatar user={user} />
              {!collapsed && (
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
                  <p className="truncate text-xs text-ink-muted">{ROLE_LABEL[user.role]}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-[#F7F7F6] hover:text-ink",
              )}
            >
              <LogOut size={16} />
              {!collapsed && "Выйти"}
            </button>
          </div>
        )}

        {/* Mobile-only equivalent of the footer above — the desktop footer hides itself below
            the lg breakpoint instead, so logout lives in exactly one visible place per breakpoint. */}
        {user && (
          <div className="p-4 lg:hidden">
            <MobileProfileCard onBeforeLogout={onCloseMobile} />
          </div>
        )}
      </aside>
    </>
  );
}
