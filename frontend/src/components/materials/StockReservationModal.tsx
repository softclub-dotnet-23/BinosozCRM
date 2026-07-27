import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { employeesRepository, objectsRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { ResponsiblePersonSelect } from "./ResponsiblePersonField";
import { formatNumber } from "../../utils/format";
import type { MaterialStockRow, StockReservation } from "../../types";

interface FormState {
  objectName: string;
  quantity: string;
  responsible: string;
  note: string;
  date: string;
}

function emptyForm(defaultResponsible: string): FormState {
  return {
    objectName: "",
    quantity: "",
    responsible: defaultResponsible,
    note: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface StockReservationModalProps {
  open: boolean;
  row: MaterialStockRow | null;
  onClose: () => void;
  onSave: (reservation: Omit<StockReservation, "id" | "createdDate" | "status">) => void;
}

export function StockReservationModal({ open, row, onClose, onSave }: StockReservationModalProps) {
  const employees = useRepositorySnapshot(employeesRepository);
  const objects = useRepositorySnapshot(objectsRepository);
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

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.quantity.trim() || Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      nextErrors.quantity = "Укажите корректное количество";
    } else if (quantityNumber > currentRow.available) {
      nextErrors.quantity = `Нельзя зарезервировать больше доступного (${formatNumber(currentRow.available)} ${currentRow.unit})`;
    }
    if (!form.responsible) nextErrors.responsible = "Укажите ответственного";
    if (!form.date) nextErrors.date = "Укажите дату";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    onSave({
      materialName: currentRow.materialName,
      warehouse: currentRow.warehouse,
      quantity: quantityNumber,
      objectName: form.objectName || null,
      responsible: form.responsible,
      date: form.date,
      note: form.note.trim(),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Резервирование материала"
      description={`${row.materialName} · ${row.warehouse}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            Зарезервировать
          </Button>
        </>
      }
    >
      <div className="rounded-[10px] bg-[#F5F5F4] px-4 py-3 text-sm">
        <span className="text-ink-secondary">Доступно для резерва: </span>
        <span className="font-bold text-ink tabular">
          {formatNumber(row.available)} {row.unit}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Количество" error={errors.quantity}>
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

        <Field label="Объект / работа">
          <CustomSelect
            searchable
            clearable
            placeholder="Без объекта"
            className="mt-1.5"
            value={form.objectName}
            onValueChange={(v) => update("objectName", v)}
            options={objects.map((o) => ({ value: o.name, label: o.name }))}
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

        <div className="sm:col-span-2">
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
