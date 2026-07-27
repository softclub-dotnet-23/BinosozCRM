import type { ObjectFilters, ObjectStatus } from "../../types";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";

const STATUS_OPTIONS: { value: ObjectStatus; label: string }[] = [
  { value: "in_progress", label: "В работе" },
  { value: "at_risk", label: "Есть риск" },
  { value: "almost_done", label: "Почти готов" },
  { value: "completed", label: "Завершён" },
];

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
  function toggleStatus(status: ObjectStatus) {
    const active = filters.statuses.includes(status);
    onChange({
      ...filters,
      statuses: active ? filters.statuses.filter((s) => s !== status) : [...filters.statuses, status],
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Фильтры"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onReset}>
            Сбросить
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply();
              onClose();
            }}
          >
            Применить
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink">Статус</p>
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
                    : "border-border-strong text-ink-secondary hover:bg-[#F5F5F4]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Город">
          <input
            type="text"
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            placeholder="Например, Душанбе"
            className={inputClass}
          />
        </Field>

        <Field label="Прораб">
          <input
            type="text"
            value={filters.foreman}
            onChange={(e) => onChange({ ...filters, foreman: e.target.value })}
            placeholder="Имя прораба"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Мин. прогресс, %">
            <input
              type="number"
              min={0}
              max={100}
              value={filters.minProgress}
              onChange={(e) => onChange({ ...filters, minProgress: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Макс. прогресс, %">
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
          <Field label="Дата начала">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Крайний срок">
            <input
              type="date"
              value={filters.deadline}
              onChange={(e) => onChange({ ...filters, deadline: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Мин. бюджет">
            <input
              type="number"
              min={0}
              value={filters.minBudget}
              onChange={(e) => onChange({ ...filters, minBudget: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Макс. бюджет">
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
