import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { mockMaterials } from "../../data/mockMaterials";
import { TRANSFER_LOCATIONS, TRANSFER_OBJECTS, TRANSFER_RESPONSIBLE } from "../../data/mockMaterialTransfers";
import { getAvailableStock } from "../../utils/materialStockEffects";
import { formatCurrency, formatNumber } from "../../utils/format";
import type { MaterialTransfer, MaterialTransferLine } from "../../types";

interface LineForm {
  materialName: string;
  quantity: string;
  unit: string;
  price: string;
}

interface FormState {
  documentNumber: string;
  date: string;
  fromWarehouse: string;
  toWarehouse: string;
  objectName: string;
  responsible: string;
  basis: string;
  note: string;
  lines: LineForm[];
}

function emptyLine(): LineForm {
  const first = mockMaterials[0];
  return { materialName: first.name, quantity: "", unit: first.unit, price: String(first.price) };
}

function emptyForm(): FormState {
  return {
    documentNumber: "",
    date: "",
    fromWarehouse: TRANSFER_LOCATIONS[0],
    toWarehouse: TRANSFER_LOCATIONS[1] ?? TRANSFER_LOCATIONS[0],
    objectName: TRANSFER_OBJECTS[0] ?? "",
    responsible: TRANSFER_RESPONSIBLE[0],
    basis: "",
    note: "",
    lines: [emptyLine()],
  };
}

function toForm(transfer: MaterialTransfer): FormState {
  return {
    documentNumber: transfer.documentNumber,
    date: transfer.date,
    fromWarehouse: transfer.fromWarehouse,
    toWarehouse: transfer.toWarehouse,
    objectName: transfer.objectName ?? "",
    responsible: transfer.responsible,
    basis: transfer.basis,
    note: transfer.note,
    lines: transfer.lines.map((l) => ({ materialName: l.materialName, quantity: String(l.quantity), unit: l.unit, price: String(l.price) })),
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface TransferFormModalProps {
  open: boolean;
  transfer: MaterialTransfer | null;
  existingDocumentNumbers: string[];
  onClose: () => void;
  onSave: (transfer: MaterialTransfer) => void;
}

export function TransferFormModal({ open, transfer, existingDocumentNumbers, onClose, onSave }: TransferFormModalProps) {
  const [form, setForm] = useState<FormState>(() => (transfer ? toForm(transfer) : emptyForm()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(transfer ? toForm(transfer) : emptyForm());
      setErrors({});
      setSaving(false);
    }
  }, [open, transfer]);

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
    const current = getAvailableStock(materialName, form.fromWarehouse);
    const originalLine =
      transfer && transfer.fromWarehouse === form.fromWarehouse ? transfer.lines.find((l) => l.materialName === materialName) : undefined;
    return current + (originalLine?.quantity ?? 0);
  }

  const grandTotal = form.lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const totalQuantity = form.lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.documentNumber.trim()) nextErrors.documentNumber = "Укажите номер документа";
    else if (existingDocumentNumbers.some((n) => n === form.documentNumber.trim() && n !== transfer?.documentNumber)) {
      nextErrors.documentNumber = "Документ с таким номером уже существует";
    }
    if (!form.date) nextErrors.date = "Укажите дату перемещения";
    if (!form.fromWarehouse) nextErrors.fromWarehouse = "Укажите склад отправления";
    if (!form.toWarehouse) nextErrors.toWarehouse = "Укажите склад назначения";
    if (form.fromWarehouse && form.toWarehouse && form.fromWarehouse === form.toWarehouse) {
      nextErrors.toWarehouse = "Откуда и куда не могут совпадать";
    }
    if (!form.responsible) nextErrors.responsible = "Укажите ответственного";

    const seenNames = new Set<string>();
    form.lines.forEach((line, i) => {
      const qty = Number(line.quantity);
      if (!line.quantity || qty <= 0) nextErrors[`qty-${i}`] = "Количество должно быть больше нуля";
      else if (qty > effectiveAvailable(line.materialName)) {
        nextErrors[`qty-${i}`] = `Недостаточно остатка на складе-отправителе (доступно ${formatNumber(
          effectiveAvailable(line.materialName),
        )} ${line.unit})`;
      }
      if (!line.price || Number(line.price) <= 0) nextErrors[`price-${i}`] = "Цена должна быть больше нуля";
      if (seenNames.has(line.materialName)) nextErrors[`dup-${i}`] = "Этот материал уже добавлен в перемещение";
      seenNames.add(line.materialName);
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    const lines: MaterialTransferLine[] = form.lines.map((l) => ({
      materialName: l.materialName,
      quantity: Number(l.quantity),
      unit: l.unit,
      price: Number(l.price),
      lineTotal: lineTotal(l),
    }));
    const saved: MaterialTransfer = {
      id: transfer?.id ?? `trf-new-${Date.now()}`,
      number: transfer?.number ?? 0,
      documentNumber: form.documentNumber.trim(),
      date: form.date,
      fromWarehouse: form.fromWarehouse,
      toWarehouse: form.toWarehouse,
      objectName: form.objectName || null,
      responsible: form.responsible,
      basis: form.basis.trim(),
      note: form.note.trim(),
      status: transfer?.status ?? "completed",
      lines,
      createdDate: transfer?.createdDate ?? form.date,
      createdBy: transfer?.createdBy ?? form.responsible,
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transfer ? "Редактировать перемещение" : "Новое перемещение"}
      description="Заполните данные о перемещении материалов между складами и объектами"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {transfer ? "Сохранить изменения" : "Создать перемещение"}
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
            placeholder="ПМ-17"
            className={cn(inputClass, errors.documentNumber && errorInputClass)}
          />
        </Field>

        <Field label="Дата перемещения" error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={cn(inputClass, errors.date && errorInputClass)}
          />
        </Field>

        <Field label="Откуда" error={errors.fromWarehouse}>
          <select
            value={form.fromWarehouse}
            onChange={(e) => {
              update("fromWarehouse", e.target.value);
              setErrors({});
            }}
            className={cn(inputClass, errors.fromWarehouse && errorInputClass)}
          >
            {TRANSFER_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Куда" error={errors.toWarehouse}>
          <select
            value={form.toWarehouse}
            onChange={(e) => {
              update("toWarehouse", e.target.value);
              setErrors({});
            }}
            className={cn(inputClass, errors.toWarehouse && errorInputClass)}
          >
            {TRANSFER_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Объект">
          <select value={form.objectName} onChange={(e) => update("objectName", e.target.value)} className={inputClass}>
            <option value="">Без объекта</option>
            {TRANSFER_OBJECTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ответственный" error={errors.responsible}>
          <select value={form.responsible} onChange={(e) => update("responsible", e.target.value)} className={inputClass}>
            {TRANSFER_RESPONSIBLE.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Основание">
          <input
            type="text"
            value={form.basis}
            onChange={(e) => update("basis", e.target.value)}
            placeholder="Заявка на перемещение материалов"
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
                    <select
                      value={line.materialName}
                      onChange={(e) => updateLine(i, { materialName: e.target.value })}
                      className={inputClass}
                    >
                      {mockMaterials.slice(0, 128).map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
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
                  <span className="text-ink-muted">Доступно на складе-отправителе: {formatNumber(available)} {line.unit}</span>
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
