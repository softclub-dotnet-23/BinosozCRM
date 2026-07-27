import { useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "../ui/Button";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { useToast } from "../../hooks/useToast";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../utils/cn";

export function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  const { showToast } = useToast();
  const { strings } = useLanguage();
  const s = strings.works;
  const c = strings.common;

  const EXPORT_ACTIONS = [
    { key: "pdf", label: s.exportPdf, icon: FileText, verb: s.exportingPdf },
    { key: "excel", label: s.exportExcel, icon: FileSpreadsheet, verb: s.exportingExcel },
    { key: "print", label: s.printReport, icon: Printer, verb: s.preparingPrint },
  ] as const;

  function handleExport(key: string, verb: string, label: string) {
    setPendingKey(key);
    showToast(`${verb}…`, "info");
    window.setTimeout(() => {
      setPendingKey(null);
      showToast(s.exportDone(label), "success");
    }, 900);
    setOpen(false);
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        <Download size={15} /> {c.exportButton} <ChevronDown size={14} />
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
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
