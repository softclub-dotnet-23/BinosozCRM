import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label?: string;
  options: SelectOption[];
}

export type SelectItems = SelectOption[] | SelectOptionGroup[];

export interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectItems;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  size?: "sm" | "md";
  /** Defaults to true for size="md" and false for size="sm", matching the previous native-select layouts. */
  fullWidth?: boolean;
  className?: string;
  id?: string;
  name?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

function isGroupedOptions(options: SelectItems): options is SelectOptionGroup[] {
  return options.length > 0 && typeof options[0] === "object" && options[0] !== null && "options" in options[0];
}

function normalizeGroups(options: SelectItems): SelectOptionGroup[] {
  if (options.length === 0) return [];
  return isGroupedOptions(options) ? options : [{ options }];
}

function matchesQuery(option: SelectOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return option.label.toLowerCase().includes(q) || (option.description?.toLowerCase().includes(q) ?? false);
}

const SIZE_TRIGGER_CLASSNAMES: Record<"sm" | "md", string> = {
  sm: "h-9 rounded-lg px-2.5 text-xs font-medium gap-1.5",
  md: "h-10 rounded-[10px] px-3.5 text-sm gap-2",
};

const SIZE_OPTION_CLASSNAMES: Record<"sm" | "md", string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
};

interface TriggerRect {
  top: number;
  left: number;
  width: number;
  bottom: number;
}

const PANEL_GAP = 6;
const PANEL_MARGIN = 12;
const PANEL_PREFERRED_HEIGHT = 288;
const PANEL_MIN_HEIGHT = 120;

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = "Выберите...",
  disabled = false,
  loading = false,
  error = false,
  searchable = false,
  clearable = false,
  size = "md",
  fullWidth,
  className,
  id,
  name,
  emptyText = "Ничего не найдено",
  searchPlaceholder = "Поиск...",
  ...ariaProps
}: CustomSelectProps) {
  const resolvedFullWidth = fullWidth ?? size !== "sm";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<TriggerRect | null>(null);
  const [openUp, setOpenUp] = useState(false);
  const [maxHeight, setMaxHeight] = useState(PANEL_PREFERRED_HEIGHT);

  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef(new Map<number, HTMLDivElement>());

  const reactId = useId();
  const listboxId = `select-${reactId}`;

  const isInteractive = !disabled && !loading;

  const groups = useMemo(() => normalizeGroups(options), [options]);

  const visibleGroups = useMemo(() => {
    if (!searchable || !query.trim()) return groups;
    return groups
      .map((g) => ({ ...g, options: g.options.filter((o) => matchesQuery(o, query)) }))
      .filter((g) => g.options.length > 0);
  }, [groups, searchable, query]);

  const renderGroups = useMemo(() => {
    let idx = -1;
    return visibleGroups.map((g, gi) => ({
      key: g.label ?? `group-${gi}`,
      label: g.label,
      options: g.options.map((option) => ({ option, index: ++idx })),
    }));
  }, [visibleGroups]);

  const flatOptions = useMemo(() => visibleGroups.flatMap((g) => g.options), [visibleGroups]);

  const selectedOption = useMemo(() => {
    for (const g of groups) {
      const found = g.options.find((o) => o.value === value);
      if (found) return found;
    }
    return undefined;
  }, [groups, value]);

  const closeSelect = useCallback((refocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openSelect = useCallback(() => {
    if (!isInteractive) return;
    const idx = flatOptions.findIndex((o) => o.value === value);
    setActiveIndex(idx === -1 ? 0 : idx);
    setOpen(true);
  }, [isInteractive, flatOptions, value]);

  const moveActive = useCallback(
    (delta: number) => {
      if (flatOptions.length === 0) return;
      setActiveIndex((prev) => {
        let idx = prev;
        for (let i = 0; i < flatOptions.length; i++) {
          idx = (idx + delta + flatOptions.length) % flatOptions.length;
          if (!flatOptions[idx].disabled) break;
        }
        return idx;
      });
    },
    [flatOptions],
  );

  const selectActive = useCallback(() => {
    const opt = flatOptions[activeIndex];
    if (!opt || opt.disabled) return;
    onValueChange(opt.value);
    closeSelect(true);
  }, [flatOptions, activeIndex, onValueChange, closeSelect]);

  // Track the trigger's viewport position while open, so the portaled panel stays aligned
  // even when an ancestor (e.g. a modal body) scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, bottom: r.bottom });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rect) return;
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - PANEL_MARGIN;
    const spaceAbove = rect.top - PANEL_GAP - PANEL_MARGIN;
    const up = spaceBelow < 180 && spaceAbove > spaceBelow;
    setOpenUp(up);
    setMaxHeight(Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_PREFERRED_HEIGHT, up ? spaceAbove : spaceBelow)));
  }, [open, rect]);

  useEffect(() => {
    if (!open || !searchable) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closeSelect(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, closeSelect]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current.get(activeIndex)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleTriggerKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!isInteractive) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (open) moveActive(1);
        else openSelect();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) moveActive(-1);
        else openSelect();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) selectActive();
        else openSelect();
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          closeSelect(true);
        }
        break;
      case "Tab":
        if (open) closeSelect(false);
        break;
    }
  }

  function handleSearchKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        break;
      case "Enter":
        e.preventDefault();
        selectActive();
        break;
      case "Escape":
        e.preventDefault();
        closeSelect(true);
        break;
      case "Tab":
        closeSelect(false);
        break;
    }
  }

  const activeOptionId =
    open && !searchable && flatOptions[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className={cn(resolvedFullWidth ? "w-full" : "inline-block", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <div
        ref={triggerRef}
        id={id}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        aria-activedescendant={activeOptionId}
        aria-label={ariaProps["aria-label"]}
        aria-labelledby={ariaProps["aria-labelledby"]}
        tabIndex={disabled ? -1 : 0}
        onClick={() => isInteractive && (open ? closeSelect(false) : openSelect())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex select-none items-center justify-between border bg-card text-left text-ink transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15",
          SIZE_TRIGGER_CLASSNAMES[size],
          resolvedFullWidth ? "w-full" : "w-auto",
          isInteractive && "cursor-pointer",
          error
            ? open
              ? "border-red ring-2 ring-red/15"
              : "border-red"
            : open
              ? "border-primary ring-2 ring-primary/15"
              : "border-border-strong hover:border-[#d4d4d2]",
          disabled && "cursor-not-allowed bg-[#FAFAF9] text-ink-muted",
          loading && "cursor-wait",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selectedOption?.icon}
          <span
            className={cn("truncate", !selectedOption && "font-normal text-ink-muted")}
            title={selectedOption?.label}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-1">
          {clearable && value && isInteractive && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Очистить"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange("");
              }}
              className="rounded p-0.5 text-ink-muted transition-colors hover:bg-[#F0F0EF] hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
          {loading ? (
            <Loader2 size={15} className="animate-spin text-ink-muted" />
          ) : (
            <ChevronDown
              size={15}
              className={cn("text-ink-muted transition-transform duration-150", open && "rotate-180")}
            />
          )}
        </span>
      </div>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            id={listboxId}
            aria-label={ariaProps["aria-label"] ?? placeholder}
            className="fixed z-[1000] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-popover)]"
            style={{
              left: rect.left,
              minWidth: rect.width,
              maxWidth: Math.max(rect.width, Math.min(360, window.innerWidth - rect.left - PANEL_MARGIN)),
              ...(openUp ? { bottom: window.innerHeight - rect.top + PANEL_GAP } : { top: rect.bottom + PANEL_GAP }),
            }}
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
                <Search size={14} className="flex-shrink-0 text-ink-muted" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  role="combobox"
                  aria-expanded={open}
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-activedescendant={flatOptions[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                />
              </div>
            )}
            <div className="overflow-y-auto py-1" style={{ maxHeight }}>
              {flatOptions.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-ink-muted">{emptyText}</p>
              ) : (
                renderGroups.map((group) => (
                  <div key={group.key}>
                    {group.label && (
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        {group.label}
                      </p>
                    )}
                    {group.options.map(({ option, index }) => {
                      const isSelected = option.value === value;
                      const isActive = index === activeIndex;
                      return (
                        <div
                          key={option.value}
                          ref={(el) => {
                            if (el) optionRefs.current.set(index, el);
                            else optionRefs.current.delete(index);
                          }}
                          id={`${listboxId}-opt-${index}`}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={option.disabled || undefined}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => {
                            if (option.disabled) return;
                            onValueChange(option.value);
                            closeSelect(true);
                          }}
                          className={cn(
                            "mx-1 flex cursor-pointer items-center gap-2 rounded-lg text-ink transition-colors",
                            SIZE_OPTION_CLASSNAMES[size],
                            isActive && !option.disabled && "bg-[#F5F5F4]",
                            isSelected && "bg-primary-soft font-medium text-primary",
                            option.disabled && "cursor-not-allowed opacity-40",
                          )}
                        >
                          {option.icon}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate" title={option.label}>
                              {option.label}
                            </span>
                            {option.description && (
                              <span className="block truncate text-xs text-ink-secondary">{option.description}</span>
                            )}
                          </span>
                          {isSelected && <Check size={14} className="flex-shrink-0 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
