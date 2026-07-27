import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { employeesRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { ResponsiblePersonSelect } from "./ResponsiblePersonField";
import { formatNumber } from "../../utils/format";
import type { MaterialStockRow, StockAdjustment, StockAdjustmentType } from "../../types";

const ADJUSTMENT_TYPE_LABEL: Record<StockAdjustmentType, string> = {
  increase: "Увеличить",
  decrease: "Уменьшить",
  set: "Установить точное значение",
};

interface FormState {
  type: StockAdjustmentType;
  quantity: string;
  reason: string;
  responsible: string;
  note: string;
  date: string;
}

function emptyForm(defaultResponsible: string): FormState {
  return {
    type: "increase",
    quantity: "",
    reason: "",
    responsible: defaultResponsible,
    note: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface StockAdjustmentModalProps {
  open: boolean;
  row: MaterialStockRow | null;
  onClose: () => void;
  onSave: (adjustment: Omit<StockAdjustment, "id" | "createdDate">, delta: number) => void;
}

export function StockAdjustmentModal({ open, row, onClose, onSave }: StockAdjustmentModalProps) {
  const employees = useRepositorySnapshot(employeesRepository);
  const [form, setForm] = useState<FormState>(() => emptyForm(employees[0]?.id ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(employees[0]?.id ?? ""));
      setErrors({});
      setSaving(false);
    }
  }, [open, row]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!row) return null;
  const currentRow = row;

  const quantityNumber = Number(form.quantity);
  const resultingQuantity =
    form.type === "increase"
      ? row.quantity + (Number.isFinite(quantityNumber) ? quantityNumber : 0)
      : form.type === "decrease"
        ? row.quantity - (Number.isFinite(quantityNumber) ? quantityNumber : 0)
        : Number.isFinite(quantityNumber)
          ? quantityNumber
          : row.quantity;
  const roundedResult = Math.round(resultingQuantity * 100) / 100;

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.quantity.trim() || Number.isNaN(quantityNumber)) {
      nextErrors.quantity = "Укажите корректное количество";
    } else if (form.type !== "set" && quantityNumber <= 0) {
      nextErrors.quantity = "Количество должно быть больше нуля";
    } else if (form.type === "set" && quantityNumber < 0) {
      nextErrors.quantity = "Количество не может быть отрицательным";
    } else if (roundedResult < 0) {
      nextErrors.quantity = "Итоговый остаток не может быть отрицательным";
    } else if (roundedResult < currentRow.reserved) {
      nextErrors.quantity = `Итоговый остаток (${formatNumber(roundedResult)}) меньше зарезервированного (${formatNumber(currentRow.reserved)} ${currentRow.unit})`;
    }
    if (!form.reason.trim()) nextErrors.reason = "Укажите причину корректировки";
    if (!form.responsible) nextErrors.responsible = "Укажите ответственного";
    if (!form.date) nextErrors.date = "Укажите дату";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);

    const delta = Math.round((roundedResult - currentRow.quantity) * 100) / 100;
    onSave(
      {
        materialName: currentRow.materialName,
        warehouse: currentRow.warehouse,
        type: form.type,
        previousQuantity: currentRow.quantity,
        adjustmentQuantity: quantityNumber,
        resultingQuantity: roundedResult,
        reason: form.reason.trim(),
        responsible: form.responsible,
        note: form.note.trim(),
        date: form.date,
      },
      delta,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Корректировка остатка"
      description={`${row.materialName} · ${row.warehouse}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            Применить корректировку
          </Button>
        </>
      }
    >
      <div className="rounded-[10px] bg-[#F5F5F4] px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-secondary">Текущий системный остаток</span>
          <span className="font-bold text-ink tabular">
            {formatNumber(row.quantity)} {row.unit}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-ink-secondary">Итог после корректировки</span>
          <span className="font-bold text-primary tabular">
            {formatNumber(roundedResult)} {row.unit}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Тип корректировки">
          <CustomSelect
            className="mt-1.5"
            value={form.type}
            onValueChange={(v) => update("type", v as StockAdjustmentType)}
            options={(Object.keys(ADJUSTMENT_TYPE_LABEL) as StockAdjustmentType[]).map((type) => ({
              value: type,
              label: ADJUSTMENT_TYPE_LABEL[type],
            }))}
          />
        </Field>

        <Field label={form.type === "set" ? "Новое значение" : "Количество"} error={errors.quantity}>
          <input
            type="number"
            min={0}
            step="any"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className={cn(inputClass, errors.quantity && errorInputClass)}
          />
        </Field>

        <Field label="Дата" error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={cn(inputClass, errors.date && errorInputClass)}
          />
        </Field>

        <Field label="Ответственный" error={errors.responsible}>
          <ResponsiblePersonSelect
            employees={employees}
            value={form.responsible}
            onChange={(value) => update("responsible", value)}
            error={Boolean(errors.responsible)}
          />
        </Field>

        <Field label="Причина" error={errors.reason}>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
            placeholder="Например: инвентаризация, пересчёт остатков"
            className={cn(inputClass, errors.reason && errorInputClass)}
          />
        </Field>

        <Field label="Примечание">
          <input
            type="text"
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            placeholder="Дополнительная информация"
            className={inputClass}
          />
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
