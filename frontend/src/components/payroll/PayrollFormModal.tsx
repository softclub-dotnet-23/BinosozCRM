import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { formatCurrency } from "../../utils/format";
import type { PayrollRecord } from "../../types";

interface FormState {
  overtimeHours: string;
  overtimeAmount: string;
  bonuses: string;
  allowances: string;
  advanceDeduction: string;
  otherDeductions: string;
  note: string;
}

function toForm(record: PayrollRecord): FormState {
  return {
    overtimeHours: String(record.overtimeHours),
    overtimeAmount: String(record.overtimeAmount),
    bonuses: String(record.bonuses),
    allowances: String(record.allowances),
    advanceDeduction: String(record.advanceDeduction),
    otherDeductions: String(record.otherDeductions),
    note: record.note,
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface PayrollFormModalProps {
  open: boolean;
  record: PayrollRecord | null;
  onClose: () => void;
  onSave: (record: PayrollRecord) => void;
}

export function PayrollFormModal({ open, record, onClose, onSave }: PayrollFormModalProps) {
  const [form, setForm] = useState<FormState>(() => (record ? toForm(record) : toForm({} as PayrollRecord)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && record) {
      setForm(toForm(record));
      setErrors({});
      setSaving(false);
    }
  }, [open, record]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!record) return null;

  const overtimeAmount = Number(form.overtimeAmount) || 0;
  const bonuses = Number(form.bonuses) || 0;
  const allowances = Number(form.allowances) || 0;
  const advanceDeduction = Number(form.advanceDeduction) || 0;
  const otherDeductions = Number(form.otherDeductions) || 0;

  const totalAccrued = Math.round((record.baseSalary + overtimeAmount + bonuses + allowances) * 100) / 100;
  const totalDeductions = Math.round((record.absenceDeduction + record.taxDeduction + advanceDeduction + otherDeductions) * 100) / 100;
  const netPayable = Math.round((totalAccrued - totalDeductions) * 100) / 100;

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries({ overtimeHours: form.overtimeHours, overtimeAmount: form.overtimeAmount, bonuses: form.bonuses, allowances: form.allowances, advanceDeduction: form.advanceDeduction, otherDeductions: form.otherDeductions })) {
      if (value.trim() && (Number.isNaN(Number(value)) || Number(value) < 0)) nextErrors[key] = "Значение не может быть отрицательным";
    }
    if (netPayable < 0) nextErrors.netPayable = "К выплате не может быть отрицательным — уменьшите удержания";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving || !record) return;
    if (!validate()) return;
    setSaving(true);
    onSave({
      ...record,
      overtimeHours: Number(form.overtimeHours) || 0,
      overtimeAmount,
      bonuses,
      allowances,
      advanceDeduction,
      otherDeductions,
      totalAccrued,
      totalDeductions,
      netPayable,
      note: form.note.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Редактировать начисление"
      description={`${record.employeeName} · ${record.periodLabel}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="rounded-[10px] bg-[#F5F5F4] px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-secondary">Оклад</span>
          <span className="font-semibold text-ink tabular">{formatCurrency(record.baseSalary)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-ink-secondary">Отработано дней</span>
          <span className="font-semibold text-ink tabular">
            {record.workedDays} / {record.totalDays}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Сверхурочные, часов" error={errors.overtimeHours}>
          <input
            type="number"
            min={0}
            value={form.overtimeHours}
            onChange={(e) => update("overtimeHours", e.target.value)}
            className={cn(inputClass, errors.overtimeHours && errorInputClass)}
          />
        </Field>
        <Field label="Сумма за сверхурочные" error={errors.overtimeAmount}>
          <input
            type="number"
            min={0}
            value={form.overtimeAmount}
            onChange={(e) => update("overtimeAmount", e.target.value)}
            className={cn(inputClass, errors.overtimeAmount && errorInputClass)}
          />
        </Field>
        <Field label="Премии" error={errors.bonuses}>
          <input
            type="number"
            min={0}
            value={form.bonuses}
            onChange={(e) => update("bonuses", e.target.value)}
            className={cn(inputClass, errors.bonuses && errorInputClass)}
          />
        </Field>
        <Field label="Надбавки" error={errors.allowances}>
          <input
            type="number"
            min={0}
            value={form.allowances}
            onChange={(e) => update("allowances", e.target.value)}
            className={cn(inputClass, errors.allowances && errorInputClass)}
          />
        </Field>
        <Field label="Удержание аванса" error={errors.advanceDeduction}>
          <input
            type="number"
            min={0}
            value={form.advanceDeduction}
            onChange={(e) => update("advanceDeduction", e.target.value)}
            className={cn(inputClass, errors.advanceDeduction && errorInputClass)}
          />
        </Field>
        <Field label="Прочие удержания" error={errors.otherDeductions}>
          <input
            type="number"
            min={0}
            value={form.otherDeductions}
            onChange={(e) => update("otherDeductions", e.target.value)}
            className={cn(inputClass, errors.otherDeductions && errorInputClass)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Примечание">
            <input type="text" value={form.note} onChange={(e) => update("note", e.target.value)} className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] bg-primary-soft px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-secondary">Начислено</span>
          <span className="font-semibold text-ink tabular">{formatCurrency(totalAccrued)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-ink-secondary">Удержания (в т.ч. налог {formatCurrency(record.taxDeduction)})</span>
          <span className="font-semibold text-ink tabular">{formatCurrency(totalDeductions)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
          <span className="font-semibold text-ink">К выплате</span>
          <span className="font-bold text-primary tabular">{formatCurrency(netPayable)}</span>
        </div>
        {errors.netPayable && <p className="mt-1 text-xs text-red">{errors.netPayable}</p>}
      </div>
    </Modal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs font-normal text-red">{error}</span>}
    </label>
  );
}
