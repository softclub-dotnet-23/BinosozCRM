import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { mockMaterials, MATERIAL_WAREHOUSES } from "../../data/mockMaterials";
import { RECEIPT_SUPPLIERS, RECEIPT_OBJECTS, RECEIPT_BRIGADES } from "../../data/mockMaterialReceipts";
import { employeesRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { ResponsiblePersonSelect } from "./ResponsiblePersonField";
import { formatCurrency, formatNumber } from "../../utils/format";
import type { MaterialReceipt, MaterialReceiptLine } from "../../types";

interface LineForm {
  materialName: string;
  quantity: string;
  unit: string;
  price: string;
}

interface FormState {
  date: string;
  supplier: string;
  objectName: string;
  brigadeName: string;
  warehouse: string;
  responsible: string;
  invoiceNumber: string;
  note: string;
  lines: LineForm[];
}

function emptyLine(): LineForm {
  const first = mockMaterials[0];
  return { materialName: first.name, quantity: "", unit: first.unit, price: String(first.price) };
}

function emptyForm(defaultResponsible: string): FormState {
  return {
    date: "",
    supplier: RECEIPT_SUPPLIERS[0],
    objectName: RECEIPT_OBJECTS[0],
    brigadeName: "",
    warehouse: MATERIAL_WAREHOUSES[0],
    responsible: defaultResponsible,
    invoiceNumber: "",
    note: "",
    lines: [emptyLine()],
  };
}

function toForm(receipt: MaterialReceipt): FormState {
  return {
    date: receipt.date,
    supplier: receipt.supplier,
    objectName: receipt.objectName,
    brigadeName: receipt.brigadeName ?? "",
    warehouse: receipt.warehouse,
    responsible: receipt.responsible,
    invoiceNumber: receipt.invoiceNumber,
    note: receipt.note,
    lines: receipt.lines.map((l) => ({ materialName: l.materialName, quantity: String(l.quantity), unit: l.unit, price: String(l.price) })),
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface ReceiptFormModalProps {
  open: boolean;
  receipt: MaterialReceipt | null;
  existingInvoiceNumbers: string[];
  onClose: () => void;
  onSave: (receipt: MaterialReceipt) => void;
}

export function ReceiptFormModal({ open, receipt, existingInvoiceNumbers, onClose, onSave }: ReceiptFormModalProps) {
  const employees = useRepositorySnapshot(employeesRepository);
  const [form, setForm] = useState<FormState>(() => (receipt ? toForm(receipt) : emptyForm(employees[0]?.id ?? "")));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(receipt ? toForm(receipt) : emptyForm(employees[0]?.id ?? ""));
      setErrors({});
      setSaving(false);
    }
  }, [open, receipt]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine(index: number, patch: Partial<LineForm>) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.materialName) {
          const catalogMaterial = mockMaterials.find((m) => m.name === patch.materialName);
          if (catalogMaterial) {
            next.unit = catalogMaterial.unit;
            if (!line.price) next.price = String(catalogMaterial.price);
          }
        }
        return next;
      }),
    }));
    setErrors({});
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));
  }

  function removeLine(index: number) {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  }

  function lineTotal(line: LineForm): number {
    const qty = Number(line.quantity);
    const price = Number(line.price);
    if (Number.isNaN(qty) || Number.isNaN(price)) return 0;
    return Math.round(qty * price * 100) / 100;
  }

  const grandTotal = form.lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const totalQuantity = form.lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.date) nextErrors.date = "Укажите дату поступления";
    if (!form.invoiceNumber.trim()) nextErrors.invoiceNumber = "Укажите номер накладной";
    else if (existingInvoiceNumbers.some((n) => n === form.invoiceNumber.trim() && n !== receipt?.invoiceNumber)) {
      nextErrors.invoiceNumber = "Накладная с таким номером уже существует";
    }

    const seenNames = new Set<string>();
    form.lines.forEach((line, i) => {
      if (!line.quantity || Number(line.quantity) <= 0) nextErrors[`qty-${i}`] = "Количество должно быть больше нуля";
      if (!line.price || Number(line.price) <= 0) nextErrors[`price-${i}`] = "Цена должна быть больше нуля";
      if (seenNames.has(line.materialName)) nextErrors[`dup-${i}`] = "Этот материал уже добавлен в поступление";
      seenNames.add(line.materialName);
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    const lines: MaterialReceiptLine[] = form.lines.map((l) => ({
      materialName: l.materialName,
      quantity: Number(l.quantity),
      unit: l.unit,
      price: Number(l.price),
      lineTotal: lineTotal(l),
    }));
    const saved: MaterialReceipt = {
      id: receipt?.id ?? `rcpt-new-${Date.now()}`,
      number: receipt?.number ?? 0,
      documentNumber: receipt?.documentNumber ?? `ПР-НОВ-${Date.now().toString().slice(-4)}`,
      date: form.date,
      supplier: form.supplier,
      objectName: form.objectName,
      brigadeName: form.brigadeName || null,
      warehouse: form.warehouse,
      responsible: form.responsible,
      invoiceNumber: form.invoiceNumber.trim(),
      note: form.note.trim(),
      lines,
      status: receipt?.status ?? "completed",
      createdDate: receipt?.createdDate ?? form.date,
      createdBy: receipt?.createdBy ?? form.responsible,
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={receipt ? "Редактировать поступление" : "Новое поступление"}
      description="Заполните данные о поступлении материалов на склад"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {receipt ? "Сохранить изменения" : "Создать поступление"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Дата поступления" error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={cn(inputClass, errors.date && errorInputClass)}
          />
        </Field>

        <Field label="Номер накладной" error={errors.invoiceNumber}>
          <input
            type="text"
            value={form.invoiceNumber}
            onChange={(e) => update("invoiceNumber", e.target.value)}
            placeholder="НК-2026-0001"
            className={cn(inputClass, errors.invoiceNumber && errorInputClass)}
          />
        </Field>

        <Field label="Поставщик">
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.supplier}
            onValueChange={(v) => update("supplier", v)}
            options={RECEIPT_SUPPLIERS.map((s) => ({ value: s, label: s }))}
          />
        </Field>

        <Field label="Объект">
          <CustomSelect
            className="mt-1.5"
            value={form.objectName}
            onValueChange={(v) => update("objectName", v)}
            options={RECEIPT_OBJECTS.map((o) => ({ value: o, label: o }))}
          />
        </Field>

        <Field label="Бригада">
          <CustomSelect
            clearable
            placeholder="Без бригады"
            className="mt-1.5"
            value={form.brigadeName}
            onValueChange={(v) => update("brigadeName", v)}
            options={RECEIPT_BRIGADES.map((b) => ({ value: b, label: b }))}
          />
        </Field>

        <Field label="Склад">
          <CustomSelect
            className="mt-1.5"
            value={form.warehouse}
            onValueChange={(v) => update("warehouse", v)}
            options={MATERIAL_WAREHOUSES.map((w) => ({ value: w, label: w }))}
          />
        </Field>

        <Field label="Ответственный">
          <ResponsiblePersonSelect employees={employees} value={form.responsible} onChange={(value) => update("responsible", value)} />
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

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Материалы</p>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus size={14} /> Добавить материал
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          {form.lines.map((line, i) => (
            <div key={i} className="rounded-[10px] border border-border-strong p-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1.6fr_0.7fr_0.6fr_0.8fr_auto] sm:items-end">
                <label className="block text-xs font-medium text-ink">
                  Материал
                  <CustomSelect
                    searchable
                    className="mt-1.5"
                    value={line.materialName}
                    onValueChange={(v) => updateLine(i, { materialName: v })}
                    options={mockMaterials.slice(0, 128).map((m) => ({ value: m.name, label: m.name }))}
                  />
                </label>
                <label className="block text-xs font-medium text-ink">
                  Кол-во
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    className={cn(inputClass, errors[`qty-${i}`] && errorInputClass)}
                  />
                </label>
                <label className="block text-xs font-medium text-ink">
                  Ед.
                  <input type="text" value={line.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} className={inputClass} />
                </label>
                <label className="block text-xs font-medium text-ink">
                  Цена
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.price}
                    onChange={(e) => updateLine(i, { price: e.target.value })}
                    className={cn(inputClass, errors[`price-${i}`] && errorInputClass)}
                  />
                </label>
                <button
                  type="button"
                  aria-label="Удалить материал"
                  onClick={() => removeLine(i)}
                  disabled={form.lines.length === 1}
                  className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                {(errors[`qty-${i}`] || errors[`price-${i}`] || errors[`dup-${i}`]) && (
                  <span className="text-red">{errors[`qty-${i}`] || errors[`price-${i}`] || errors[`dup-${i}`]}</span>
                )}
                <span className="ml-auto font-semibold text-ink">Сумма: {formatCurrency(lineTotal(line))}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[10px] bg-[#F5F5F4] px-4 py-3 text-sm">
          <span className="text-ink-secondary">
            Материалов: <span className="font-semibold text-ink">{form.lines.length}</span> · Кол-во:{" "}
            <span className="font-semibold text-ink tabular">{formatNumber(totalQuantity)}</span>
          </span>
          <span className="font-bold text-ink tabular">Итого: {formatCurrency(grandTotal)}</span>
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
