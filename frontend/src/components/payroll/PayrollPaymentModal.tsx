import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { formatCurrency } from "../../utils/format";
import type { PayrollRecord } from "../../types";

interface FormState {
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string;
  note: string;
}

const PAYMENT_METHODS = ["Банковский перевод", "Наличными", "На карту"];

function emptyForm(record: PayrollRecord | null): FormState {
  return {
    paymentDate: record?.paymentDate ?? new Date().toISOString().slice(0, 10),
    paymentMethod: PAYMENT_METHODS[0],
    paymentReference: "",
    note: "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface PayrollPaymentModalProps {
  open: boolean;
  record: PayrollRecord | null;
  onClose: () => void;
  onConfirm: (payment: { paymentDate: string; paymentMethod: string; paymentReference: string; note: string }) => void;
}

export function PayrollPaymentModal({ open, record, onClose, onConfirm }: PayrollPaymentModalProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(record));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(record));
      setErrors({});
      setSaving(false);
    }
  }, [open, record]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!record) return null;

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.paymentDate) nextErrors.paymentDate = "Укажите дату выплаты";
    if (!form.paymentReference.trim()) nextErrors.paymentReference = "Укажите номер документа";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    onConfirm(form);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Отметить как выплачено"
      description={`${record.employeeName} · ${record.periodLabel}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            Подтвердить выплату
          </Button>
        </>
      }
    >
      <div className="rounded-[10px] bg-green-soft px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-secondary">К выплате</span>
          <span className="font-bold text-green tabular">{formatCurrency(record.netPayable)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <Field label="Дата выплаты" error={errors.paymentDate}>
          <input
            type="date"
            value={form.paymentDate}
            onChange={(e) => update("paymentDate", e.target.value)}
            className={cn(inputClass, errors.paymentDate && errorInputClass)}
          />
        </Field>
        <Field label="Способ выплаты">
          <CustomSelect
            className="mt-1.5"
            value={form.paymentMethod}
            onValueChange={(v) => update("paymentMethod", v)}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
          />
        </Field>
        <Field label="Номер документа" error={errors.paymentReference}>
          <input
            type="text"
            value={form.paymentReference}
            onChange={(e) => update("paymentReference", e.target.value)}
            placeholder="PAY-2026-08-001"
            className={cn(inputClass, errors.paymentReference && errorInputClass)}
          />
        </Field>
        <Field label="Примечание">
          <input type="text" value={form.note} onChange={(e) => update("note", e.target.value)} className={inputClass} />
        </Field>
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
