import { useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "../ui/Button";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../utils/cn";

const EXPORT_ACTIONS = [
  { key: "pdf", label: "Экспорт PDF", icon: FileText, verb: "Экспорт в PDF" },
  { key: "excel", label: "Экспорт Excel", icon: FileSpreadsheet, verb: "Экспорт в Excel" },
  { key: "print", label: "Печать отчёта", icon: Printer, verb: "Подготовка отчёта к печати" },
] as const;

export function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  const { showToast } = useToast();

  function handleExport(key: string, verb: string, label: string) {
    setPendingKey(key);
    showToast(`${verb}…`, "info");
    window.setTimeout(() => {
      setPendingKey(null);
      showToast(`${label}: готово`, "success");
    }, 900);
    setOpen(false);
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        <Download size={15} /> Экспорт <ChevronDown size={14} />
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-popover)]">
          {EXPORT_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isPending = pendingKey === action.key;
            return (
              <button
                key={action.key}
                type="button"
                disabled={isPending}
                onClick={() => handleExport(action.key, action.verb, action.label)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-[#F7F7F6] disabled:opacity-60"
              >
                <Icon size={14} className={cn(isPending && "animate-spin")} />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
