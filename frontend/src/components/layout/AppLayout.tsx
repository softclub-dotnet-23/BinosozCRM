import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useMediaQuery } from "../../hooks/useMediaQuery";

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
}

export function AppLayout({ title, subtitle, children, search, action }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isTablet = useMediaQuery("(max-width: 1180px) and (min-width: 1024px)");

  return (
    <div className="flex min-h-screen w-full items-start bg-app-bg">
      <Sidebar collapsed={isTablet} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} subtitle={subtitle} onOpenMobileSidebar={() => setMobileOpen(true)} search={search} action={action} />
        <main className="flex-1 px-5 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
