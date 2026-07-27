import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { mockMaterials, MATERIAL_WAREHOUSES } from "../../data/mockMaterials";
import { WRITE_OFF_OBJECTS, WRITE_OFF_BRIGADES } from "../../data/mockMaterialWriteOffs";
import { employeesRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { ResponsiblePersonSelect } from "./ResponsiblePersonField";
import { WRITE_OFF_REASONS, writeOffReasonLabel } from "./InventoryStatusBadges";
import { getAvailableStock } from "../../utils/materialStockEffects";
import { formatCurrency, formatNumber } from "../../utils/format";
import type { MaterialWriteOff, MaterialWriteOffLine, WriteOffReason } from "../../types";

interface LineForm {
  materialName: string;
  quantity: string;
  unit: string;
  price: string;
}

interface FormState {
  documentNumber: string;
  date: string;
  objectName: string;
  brigadeName: string;
  warehouse: string;
  responsible: string;
  reason: WriteOffReason;
  basis: string;
  note: string;
  requiresReview: boolean;
  lines: LineForm[];
}

function emptyLine(): LineForm {
  const first = mockMaterials[0];
  return { materialName: first.name, quantity: "", unit: first.unit, price: String(first.price) };
}

function emptyForm(defaultResponsible: string): FormState {
  return {
    documentNumber: "",
    date: "",
    objectName: WRITE_OFF_OBJECTS[0],
    brigadeName: "",
    warehouse: MATERIAL_WAREHOUSES[0],
    responsible: defaultResponsible,
    reason: "construction_works",
    basis: "",
    note: "",
    requiresReview: false,
    lines: [emptyLine()],
  };
}

function toForm(writeOff: MaterialWriteOff): FormState {
  return {
    documentNumber: writeOff.documentNumber,
    date: writeOff.date,
    objectName: writeOff.objectName,
    brigadeName: writeOff.brigadeName ?? "",
    warehouse: writeOff.warehouse,
    responsible: writeOff.responsible,
    reason: writeOff.reason,
    basis: writeOff.basis,
    note: writeOff.note,
    requiresReview: writeOff.requiresReview,
    lines: writeOff.lines.map((l) => ({ materialName: l.materialName, quantity: String(l.quantity), unit: l.unit, price: String(l.price) })),
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface WriteOffFormModalProps {
  open: boolean;
  writeOff: MaterialWriteOff | null;
  existingDocumentNumbers: string[];
  onClose: () => void;
  onSave: (writeOff: MaterialWriteOff) => void;
}

export function WriteOffFormModal({ open, writeOff, existingDocumentNumbers, onClose, onSave }: WriteOffFormModalProps) {
  const employees = useRepositorySnapshot(employeesRepository);
  const [form, setForm] = useState<FormState>(() => (writeOff ? toForm(writeOff) : emptyForm(employees[0]?.id ?? "")));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(writeOff ? toForm(writeOff) : emptyForm(employees[0]?.id ?? ""));
      setErrors({});
      setSaving(false);
    }
  }, [open, writeOff]);

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

  function effectiveAvailable(materialName: string): number {
    const current = getAvailableStock(materialName, form.warehouse);
    const originalLine =
      writeOff && writeOff.warehouse === form.warehouse ? writeOff.lines.find((l) => l.materialName === materialName) : undefined;
    return current + (originalLine?.quantity ?? 0);
  }

  const grandTotal = form.lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const totalQuantity = form.lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.documentNumber.trim()) nextErrors.documentNumber = "Укажите номер документа";
    else if (
      existingDocumentNumbers.some((n) => n === form.documentNumber.trim() && n !== writeOff?.documentNumber)
    ) {
      nextErrors.documentNumber = "Документ с таким номером уже существует";
    }
    if (!form.date) nextErrors.date = "Укажите дату списания";
    if (!form.warehouse) nextErrors.warehouse = "Укажите склад";
    if (!form.responsible) nextErrors.responsible = "Укажите ответственного";

    const seenNames = new Set<string>();
    form.lines.forEach((line, i) => {
      const qty = Number(line.quantity);
      if (!line.quantity || qty <= 0) nextErrors[`qty-${i}`] = "Количество должно быть больше нуля";
      else if (qty > effectiveAvailable(line.materialName)) {
        nextErrors[`qty-${i}`] = `Недостаточно остатка (доступно ${formatNumber(effectiveAvailable(line.materialName))} ${line.unit})`;
      }
      if (!line.price || Number(line.price) <= 0) nextErrors[`price-${i}`] = "Цена должна быть больше нуля";
      if (seenNames.has(line.materialName)) nextErrors[`dup-${i}`] = "Этот материал уже добавлен в списание";
      seenNames.add(line.materialName);
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    const lines: MaterialWriteOffLine[] = form.lines.map((l) => ({
      materialName: l.materialName,
      quantity: Number(l.quantity),
      unit: l.unit,
      price: Number(l.price),
      lineTotal: lineTotal(l),
    }));
    const saved: MaterialWriteOff = {
      id: writeOff?.id ?? `wo-new-${Date.now()}`,
      number: writeOff?.number ?? 0,
      documentNumber: form.documentNumber.trim(),
      date: form.date,
      objectName: form.objectName,
      brigadeName: form.brigadeName || null,
      warehouse: form.warehouse,
      responsible: form.responsible,
      reason: form.reason,
      basis: form.basis.trim(),
      note: form.note.trim(),
      requiresReview: form.requiresReview,
      lines,
      createdDate: writeOff?.createdDate ?? form.date,
      createdBy: writeOff?.createdBy ?? form.responsible,
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={writeOff ? "Редактировать списание" : "Новое списание"}
      description="Заполните данные о списании материалов со склада"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {writeOff ? "Сохранить изменения" : "Создать списание"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Номер документа" error={errors.documentNumber}>
          <input
            type="text"
            value={form.documentNumber}
            onChange={(e) => update("documentNumber", e.target.value)}
            placeholder="СП-21"
            className={cn(inputClass, errors.documentNumber && errorInputClass)}
          />
        </Field>

        <Field label="Дата списания" error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={cn(inputClass, errors.date && errorInputClass)}
          />
        </Field>

        <Field label="Объект">
          <CustomSelect
            className="mt-1.5"
            value={form.objectName}
            onValueChange={(v) => update("objectName", v)}
            options={WRITE_OFF_OBJECTS.map((o) => ({ value: o, label: o }))}
          />
        </Field>

        <Field label="Бригада">
          <CustomSelect
            clearable
            placeholder="Без бригады"
            className="mt-1.5"
            value={form.brigadeName}
            onValueChange={(v) => update("brigadeName", v)}
            options={WRITE_OFF_BRIGADES.map((b) => ({ value: b, label: b }))}
          />
        </Field>

        <Field label="Склад" error={errors.warehouse}>
          <CustomSelect
            error={Boolean(errors.warehouse)}
            className="mt-1.5"
            value={form.warehouse}
            onValueChange={(v) => {
              update("warehouse", v);
              setErrors({});
            }}
            options={MATERIAL_WAREHOUSES.map((w) => ({ value: w, label: w }))}
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

        <Field label="Причина">
          <CustomSelect
            className="mt-1.5"
            value={form.reason}
            onValueChange={(v) => update("reason", v as WriteOffReason)}
            options={WRITE_OFF_REASONS.map((r) => ({ value: r, label: writeOffReasonLabel(r) }))}
          />
        </Field>

        <Field label="Основание">
          <input
            type="text"
            value={form.basis}
            onChange={(e) => update("basis", e.target.value)}
            placeholder="Акт списания материалов"
            className={inputClass}
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

        <label className="flex items-center gap-2 pt-6 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={form.requiresReview}
            onChange={(e) => update("requiresReview", e.target.checked)}
            className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/30"
          />
          Требует проверки
        </label>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Материалы</p>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus size={14} /> Добавить материал
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          {form.lines.map((line, i) => {
            const available = effectiveAvailable(line.materialName);
            return (
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
                  <span className="text-ink-muted">Доступно: {formatNumber(available)} {line.unit}</span>
                  {(errors[`qty-${i}`] || errors[`price-${i}`] || errors[`dup-${i}`]) && (
                    <span className="text-red">{errors[`qty-${i}`] || errors[`price-${i}`] || errors[`dup-${i}`]}</span>
                  )}
                  <span className="ml-auto font-semibold text-ink">Сумма: {formatCurrency(lineTotal(line))}</span>
                </div>
              </div>
            );
          })}
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
