import { useRef, useState, type ReactNode } from "react";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { cn } from "../../utils/cn";

interface DropdownMenuProps {
  trigger: ReactNode;
  align?: "left" | "right";
  items: { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean }[];
}

export function DropdownMenu({ trigger, align = "right", items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
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
          className={cn(
            "absolute z-20 mt-1 w-44 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F7F7F6]",
                item.danger ? "text-red" : "text-ink",
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
