import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { readJson } from "../../lib/storage/localStorageEngine";

interface AppLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  action?: ReactNode;
  titleBelowHeader?: boolean;
  contentMaxWidth?: string;
}

export function AppLayout({ title, subtitle, children, search, action, titleBelowHeader = false, contentMaxWidth = "1600px" }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isTablet = useMediaQuery("(max-width: 1180px) and (min-width: 1024px)");
  // Real, persisted "Отображение бокового меню" preference (Settings → General) — desktop still
  // defaults to expanded, but a user who chose "Сжато" gets it collapsed everywhere, not just on
  // tablet widths where it was already forced collapsed for space reasons.
  const prefersCollapsed = readJson<{ sidebar?: string }>("app.settings.v1")?.sidebar === "collapsed";

  return (
    <div className="flex min-h-screen w-full items-start bg-app-bg">
      <Sidebar collapsed={isTablet || prefersCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} subtitle={subtitle} compact={titleBelowHeader} onOpenMobileSidebar={() => setMobileOpen(true)} search={search} action={action} />
        <main className="flex-1 px-5 py-6 sm:px-8">
          <div className="mx-auto w-full" style={{ maxWidth: contentMaxWidth }}>
            {titleBelowHeader && <div className="mb-4"><h1 className="text-2xl font-bold leading-tight text-ink">{title}</h1><p className="mt-1 text-sm text-ink-secondary">{subtitle}</p></div>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
