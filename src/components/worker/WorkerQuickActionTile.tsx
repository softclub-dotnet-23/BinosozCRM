import type { LucideIcon } from "lucide-react";

/** Shared between the Dashboard's 3×2 quick-action grid and the "Мои работы" page's 3-tile grid. */
export function WorkerQuickActionTile({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-19 flex-col items-center justify-center gap-2 rounded-xl border border-border px-1.5 py-3 text-center text-[11px] font-medium text-ink-secondary transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary"
    >
      <Icon size={19} />
      <span className="leading-tight">{label}</span>
    </button>
  );
}
