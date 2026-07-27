import type { StaffCategory, StaffFilters } from "../../types";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";

function buildCategoryOptions(e: AppStrings["employees"]): { value: StaffCategory; label: string }[] {
  return [
    { value: "worker", label: e.categoryWorkers },
    { value: "engineer", label: e.categoryEngineers },
    { value: "admin", label: e.categoryAdmin },
  ];
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

interface EmployeeFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: StaffFilters;
  onChange: (filters: StaffFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export function EmployeeFilterDrawer({ open, onClose, filters, onChange, onApply, onReset }: EmployeeFilterDrawerProps) {
  const { strings } = useLanguage();
  const e = strings.employees;
  const c = strings.common;
  const CATEGORY_OPTIONS = buildCategoryOptions(e);

  function toggleCategory(category: StaffCategory) {
    const active = filters.categories.includes(category);
    onChange({
      ...filters,
      categories: active ? filters.categories.filter((c) => c !== category) : [...filters.categories, category],
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={c.filtersButton}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onReset}>
            {c.resetButton}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply();
              onClose();
            }}
          >
            {c.applyButton}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink">{e.filterCategoryTitle}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleCategory(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filters.categories.includes(opt.value)
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border-strong text-ink-secondary hover:bg-surface-3",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">
            {e.hireDateFromLabel}
            <input
              type="date"
              value={filters.hireDateFrom}
              onChange={(ev) => onChange({ ...filters, hireDateFrom: ev.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            {e.hireDateToLabel}
            <input
              type="date"
              value={filters.hireDateTo}
              onChange={(ev) => onChange({ ...filters, hireDateTo: ev.target.value })}
              className={inputClass}
            />
          </label>
        </div>
      </div>
    </Drawer>
  );
}
