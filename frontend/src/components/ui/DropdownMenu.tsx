import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

interface DropdownMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  align?: "left" | "right";
  items: DropdownMenuItem[];
  /** Announced via aria-label/title on the trigger button — every row-actions menu in the app
   * should read the same way to assistive tech, so this defaults to "Действия" rather than
   * requiring every call site to repeat it. */
  ariaLabel?: string;
}

interface TriggerRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const GAP = 8;
const MARGIN = 12;

/**
 * Portaled into document.body with `position: fixed`, positioned from the trigger's own
 * getBoundingClientRect() — the same technique CustomSelect already uses. Any table row using
 * this menu (sticky action columns, horizontally/vertically scrolling table wrappers) previously
 * clipped the old `position: absolute` panel because it never escaped the row/table's own overflow
 * and stacking context; rendering at the document root sidesteps that entirely instead of papering
 * over it with a bigger z-index.
 */
export function DropdownMenu({ trigger, align = "right", items, ariaLabel = "Действия" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<TriggerRect | null>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const menuId = `dropdown-menu-${reactId}`;

  function close(refocus: boolean) {
    setOpen(false);
    setPlacement(null);
    if (refocus) triggerRef.current?.focus();
  }

  // Track the trigger's viewport position while open, so the portaled panel stays aligned even
  // when an ancestor table/card scrolls (captured on the capture phase so it fires for any
  // scrollable ancestor, not just window-level scroll).
  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Measure the actual panel size once it's rendered (off-screen on the first pass) so the
  // collision math uses real dimensions instead of a guessed width/height.
  useLayoutEffect(() => {
    if (!open || !rect) return;
    const panel = panelRef.current;
    const menuWidth = panel?.offsetWidth ?? 200;
    const menuHeight = panel?.offsetHeight ?? items.length * 42 + 16;

    let top = rect.bottom + GAP;
    if (top + menuHeight > window.innerHeight - MARGIN) {
      top = rect.top - menuHeight - GAP;
    }
    top = Math.max(MARGIN, top);

    let left = align === "right" ? rect.right - menuWidth : rect.left;
    if (left < MARGIN) left = MARGIN;
    if (left + menuWidth > window.innerWidth - MARGIN) left = window.innerWidth - menuWidth - MARGIN;

    setPlacement({ top, left });
  }, [open, rect, align, items.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      close(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const firstEnabled = panelRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']:not(:disabled)");
      firstEnabled?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          open && "bg-primary-soft text-primary hover:bg-primary-soft",
        )}
      >
        {trigger}
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            style={{
              position: "fixed",
              zIndex: 1000,
              top: placement?.top ?? rect.bottom + GAP,
              left: placement?.left ?? (align === "right" ? rect.right - 200 : rect.left),
              visibility: placement ? "visible" : "hidden",
            }}
            className="w-max min-w-[190px] max-w-64 rounded-xl border border-border bg-card p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  close(true);
                }}
                className={cn(
                  "flex h-[42px] w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-left text-sm transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  item.danger ? "text-red hover:bg-red-soft" : "text-ink hover:bg-surface-2",
                  item.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
