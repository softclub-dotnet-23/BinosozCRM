import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { cn } from "../../utils/cn";

interface DropdownMenuProps {
  trigger: ReactNode;
  /** Only needed when `trigger` is icon-only content with no text of its own — gives the button an accessible name. */
  triggerLabel?: string;
  align?: "left" | "right";
  items: { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }[];
}

export function DropdownMenu({ trigger, triggerLabel, align = "right", items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useOnClickOutside(ref, () => setOpen(false));

  // Dropdowns don't trap Tab (letting focus move past them is expected), but
  // Escape should still close and hand focus back to the trigger — same
  // restoration intent as Modal/Drawer, just without the full focus trap.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink"
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute z-20 mt-1 w-44 rounded-xl border border-border bg-card p-1.5 shadow-(--shadow-popover)",
            align === "right" ? "right-0" : "left-0",
          )}
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
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F7F7F6]",
                item.danger ? "text-red" : "text-ink",
                item.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
