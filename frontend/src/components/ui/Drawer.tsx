import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDialogFocus } from "../../hooks/useDialogFocus";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(open, onClose, containerRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#171717]/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-sm flex-col bg-card shadow-(--shadow-popover) animate-[drawer-in_200ms_ease-out]"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 id={titleId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-[#F5F5F4] hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center gap-3 border-t border-border px-6 py-4">{footer}</div>}
      </div>
      <style>{`
        @keyframes drawer-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
