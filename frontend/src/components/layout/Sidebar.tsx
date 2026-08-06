import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  HardHat,
  Home,
  LifeBuoy,
  Package,
  Settings,
  User,
  Users,
  Wallet,
  BarChart3,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { AppLogo } from "../common/AppLogo";
import { MobileProfileCard } from "./MobileProfileCard";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { isRouteAllowed } from "../../lib/auth/roleAccess";
import type { AppStrings } from "../../lib/i18n/appStrings";

/**
 * Icon-only crop of the official logo (see AppLogo/binosoz-main-logo.svg) for the
 * collapsed sidebar's ~40px icon slot — the full horizontal lockup doesn't fit there
 * without shrinking the wordmark to illegibility, so this is the same brand mark
 * geometry, not a different logo.
 */
function CollapsedLogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="-5 -5 210 230" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="#FF5A00"
        fillRule="evenodd"
        d="M20,20 L58,20 Q95,20 110,42 L154,9 L147,2 L185,5 L181,43 L173,34 L130,68 Q110,95 98,108 Q158,108 158,161 Q158,215 98,215 L35,215 Q20,215 20,200 Z
           M78,140 L128,140 Q140,140 140,158 L140,178 Q140,196 122,196 L80,196 Q68,196 68,178 L68,158 Q68,140 78,140 Z
           M72,38 L98,38 Q108,38 108,50 L108,75 Q108,90 95,90 L72,90 Q62,90 62,75 L62,50 Q62,38 72,38 Z"
      />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

interface NavAction {
  label: string;
  icon: typeof Home;
  onClick: () => void;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: typeof Home;
  children: { to: string; label: string }[];
}

type NavEntry = NavItem | NavGroup | NavAction;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

function isNavAction(entry: NavEntry): entry is NavAction {
  return "onClick" in entry;
}

function buildNavItems(s: AppStrings["sidebar"]): NavEntry[] {
  return [
    { to: "/dashboard", label: s.dashboard, icon: Home },
    { to: "/objects", label: s.objects, icon: Building2 },
    {
      label: s.estimatesAndBudgets,
      icon: Calculator,
      children: [
        { to: "/estimates", label: s.estimates },
        { to: "/budgets", label: s.budgets },
      ],
    },
    {
      label: s.works,
      icon: ClipboardCheck,
      children: [
        { to: "/works", label: "Список работ" },
        { to: "/individual-tasks", label: "Индивидуальные задачи" },
      ],
    },
    {
      label: s.brigades,
      icon: HardHat,
      children: [
        { to: "/brigades", label: s.brigadesList },
        { to: "/brigades/composition", label: s.brigadesComposition },
        { to: "/brigades/assignments", label: s.assignments },
      ],
    },
    { to: "/employees", label: s.employees, icon: User },
    { to: "/attendance", label: s.attendance, icon: Calendar },
    {
      label: "Материалы",
      icon: Package,
      children: [
        { to: "/material-requests", label: "Заявки на материалы" },
        { to: "/material-deliveries", label: "Поступления материалов" },
        { to: "/material-consumption-reports", label: "Списания материалов" },
      ],
    },
    { to: "/payroll", label: s.payroll, icon: Wallet },
    { to: "/reports", label: s.reports, icon: BarChart3 },
    { to: "/users", label: s.users, icon: Users },
    { to: "/settings", label: s.settings, icon: Settings },
  ];
}

function buildBrigadirNavItems(s: AppStrings["sidebar"]): NavEntry[] {
  return [
    { to: "/dashboard", label: s.dashboard, icon: Home },
    { to: "/brigades", label: s.myBrigade, icon: Users },
    {
      label: s.assignedWorks,
      icon: ClipboardCheck,
      children: [
        { to: "/works", label: "Список работ" },
        { to: "/individual-tasks", label: "Мои задачи" },
        { to: "/work-orders", label: "Мои наряды" },
      ],
    },
    { to: "/attendance", label: s.attendance, icon: Calendar },
    {
      label: s.materials,
      icon: Package,
      children: [
        { to: "/material-requests", label: "Заявки на материалы" },
        { to: "/material-consumption-reports", label: "Списания материалов" },
      ],
    },
    { to: "/payroll", label: s.payroll, icon: Wallet },
    { to: "/profile", label: "Профиль", icon: User },
  ];
}

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ collapsed = false, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { strings } = useLanguage();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const navRef = useRef<HTMLElement>(null);

  const visibleNavItems = useMemo(
    () =>
      user
        ? (user.role === "brigadir" ? buildBrigadirNavItems(strings.sidebar) : buildNavItems(strings.sidebar))
            .map((entry) =>
              isNavGroup(entry) ? { ...entry, children: entry.children.filter((c) => isRouteAllowed(user.role, c.to)) } : entry,
            )
            .filter((entry) => (isNavGroup(entry) ? entry.children.length > 0 : isNavAction(entry) ? true : isRouteAllowed(user.role, entry.to)))
        : [],
    [user, strings],
  );

  useEffect(() => {
    visibleNavItems.forEach((entry) => {
      if (isNavGroup(entry) && entry.children.some((c) => location.pathname.startsWith(c.to))) {
        setExpandedGroups((prev) => (prev.has(entry.label) ? prev : new Set(prev).add(entry.label)));
      }
    });
  }, [location.pathname, visibleNavItems]);

  // Keep the active item (and its expanded group) in view when the sidebar's own list
  // is taller than the viewport — otherwise navigating can leave the active link
  // scrolled out of sight with no visual link back to where you are in the menu.
  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [location.pathname, expandedGroups]);

  // The mobile drawer's backdrop and X button already close it; Escape didn't (Modal/Drawer
  // elsewhere in the app already treat Escape as a close key, this brought the mobile sidebar
  // drawer in line with that same convention).
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseMobile?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

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
          className="fixed inset-0 z-40 bg-[#171717]/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-[width,transform] duration-200",
          collapsed ? "w-[84px]" : "w-[200px]",
          "fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-6">
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            {collapsed ? (
              <CollapsedLogoMark className="h-8 w-8 shrink-0" />
            ) : (
              <AppLogo className="app-logo" />
            )}
          </div>
          <button
            type="button"
            aria-label={strings.sidebar.closeMenu}
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav ref={navRef} className="sidebar-nav-scroll flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
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
                      isGroupActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-surface-2 hover:text-ink",
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
                    title={entry.label}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors duration-150",
                      isGroupActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {isGroupActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <entry.icon size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">{entry.label}</span>
                    <ChevronDown
                      size={14}
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
                              isActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-surface-2 hover:text-ink",
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

            if (isNavAction(entry)) {
              return (
                <button
                  key={entry.label}
                  type="button"
                  onClick={entry.onClick}
                  title={collapsed ? entry.label : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <span className="relative shrink-0">
                    <entry.icon size={18} />
                    {!!entry.badge && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                        {entry.badge}
                      </span>
                    )}
                  </span>
                  {!collapsed && <span className="min-w-0 flex-1 text-left leading-tight">{entry.label}</span>}
                </button>
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
                    isActive ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-surface-2 hover:text-ink",
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
                    <span className="relative shrink-0">
                      <entry.icon size={18} />
                      {!!entry.badge && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                          {entry.badge}
                        </span>
                      )}
                    </span>
                    {!collapsed && <span className="min-w-0 flex-1 leading-tight">{entry.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Only rendered for brigadir (help card) — otherwise this border+padding would be dead
            space on desktop, since the mobile profile card below hides itself above lg. */}
        {user && user.role === "brigadir" && !collapsed && (
          <div className="space-y-3 border-t border-border p-4">
            <div className="rounded-xl border border-border-strong bg-surface-1 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <LifeBuoy size={14} className="text-primary" /> Нужна помощь?
              </p>
              <p className="mt-0.5 text-xs text-ink-secondary">Свяжитесь с прорабом</p>
            </div>
          </div>
        )}

        {user && (
          <div className="p-4 lg:hidden">
            <MobileProfileCard onBeforeLogout={onCloseMobile} />
          </div>
        )}
      </aside>
    </>
  );
}
