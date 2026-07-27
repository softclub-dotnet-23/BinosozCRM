import type { ObjectFilters, ObjectStatus } from "../../types";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: ObjectFilters;
  onChange: (filters: ObjectFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export function FilterDrawer({ open, onClose, filters, onChange, onApply, onReset }: FilterDrawerProps) {
  const { strings } = useLanguage();
  const s = strings.objects;
  const c = strings.common;

  const STATUS_OPTIONS: { value: ObjectStatus; label: string }[] = [
    { value: "in_progress", label: c.statusInProgress },
    { value: "at_risk", label: c.statusAtRisk },
    { value: "almost_done", label: c.statusAlmostDone },
    { value: "completed", label: c.statusCompleted },
  ];

  function toggleStatus(status: ObjectStatus) {
    const active = filters.statuses.includes(status);
    onChange({
      ...filters,
      statuses: active ? filters.statuses.filter((st) => st !== status) : [...filters.statuses, status],
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={s.filterDrawerTitle}
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
          <p className="text-sm font-semibold text-ink">{c.colStatus}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filters.statuses.includes(opt.value)
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border-strong text-ink-secondary hover:bg-surface-3",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Field label={s.filterCity}>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            placeholder={s.fieldCityPlaceholder}
            className={inputClass}
          />
        </Field>

        <Field label={s.filterForeman}>
          <input
            type="text"
            value={filters.foreman}
            onChange={(e) => onChange({ ...filters, foreman: e.target.value })}
            placeholder={s.fieldForemanPlaceholder}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={s.filterMinProgress}>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.minProgress}
              onChange={(e) => onChange({ ...filters, minProgress: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={s.filterMaxProgress}>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.maxProgress}
              onChange={(e) => onChange({ ...filters, maxProgress: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={s.summaryStartDate}>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={s.summaryDeadline}>
            <input
              type="date"
              value={filters.deadline}
              onChange={(e) => onChange({ ...filters, deadline: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={s.filterMinBudget}>
            <input
              type="number"
              min={0}
              value={filters.minBudget}
              onChange={(e) => onChange({ ...filters, minBudget: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={s.filterMaxBudget}>
            <input
              type="number"
              min={0}
              value={filters.maxBudget}
              onChange={(e) => onChange({ ...filters, maxBudget: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}
