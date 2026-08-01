import { Loader2 } from "lucide-react";

/** Suspense fallback while a lazy-loaded route chunk downloads — keeps the screen from going blank between navigations. */
export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-secondary">
        <Loader2 size={28} className="animate-spin" />
        <span className="text-sm">Загрузка...</span>
      </div>
    </div>
  );
}
