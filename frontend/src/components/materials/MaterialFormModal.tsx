import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { MATERIAL_CATEGORIES, MATERIAL_SUPPLIERS, MATERIAL_WAREHOUSES, CATEGORY_IMAGE } from "../../data/mockMaterials";
import type { Material } from "../../types";

interface FormState {
  name: string;
  category: string;
  supplier: string;
  unit: string;
  unitDetail: string;
  stock: string;
  minStock: string;
  price: string;
  warehouse: string;
  note: string;
}

function emptyForm(): FormState {
  return {
    name: "",
    category: MATERIAL_CATEGORIES[0],
    supplier: MATERIAL_SUPPLIERS[0],
    unit: "шт",
    unitDetail: "",
    stock: "",
    minStock: "",
    price: "",
    warehouse: MATERIAL_WAREHOUSES[0],
    note: "",
  };
}

function toForm(material: Material): FormState {
  return {
    name: material.name,
    category: material.category,
    supplier: material.supplier,
    unit: material.unit,
    unitDetail: material.unitDetail ?? "",
    stock: String(material.stock),
    minStock: String(material.minStock),
    price: String(material.price),
    warehouse: material.warehouse,
    note: material.note,
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface MaterialFormModalProps {
  open: boolean;
  material: Material | null;
  onClose: () => void;
  onSave: (material: Material) => void;
}

export function MaterialFormModal({ open, material, onClose, onSave }: MaterialFormModalProps) {
  const [form, setForm] = useState<FormState>(() => (material ? toForm(material) : emptyForm()));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(material ? toForm(material) : emptyForm());
      setErrors({});
      setImagePreview(null);
      setSaving(false);
    }
  }, [open, material]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleImageChange(file: File | undefined) {
    if (!file) return;
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Укажите название материала";
    if (!form.stock || Number.isNaN(Number(form.stock)) || Number(form.stock) < 0) nextErrors.stock = "Укажите остаток числом";
    if (!form.minStock || Number.isNaN(Number(form.minStock)) || Number(form.minStock) < 0) nextErrors.minStock = "Укажите минимальный остаток числом";
    if (!form.price || Number.isNaN(Number(form.price)) || Number(form.price) <= 0) nextErrors.price = "Укажите цену больше нуля";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    const saved: Material = {
      id: material?.id ?? `mat-new-${Date.now()}`,
      number: material?.number ?? 0,
      name: form.name.trim(),
      category: form.category,
      supplier: form.supplier,
      unit: form.unit.trim() || "шт",
      unitDetail: form.unitDetail.trim() || null,
      imageUrl: imagePreview ?? material?.imageUrl ?? CATEGORY_IMAGE[form.category] ?? "/images/materials/cement-m400.jpg",
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      price: Number(form.price),
      warehouse: form.warehouse,
      note: form.note.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={material ? "Редактировать материал" : "Добавить материал"}
      description="Заполните данные о материале на складе"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {material ? "Сохранить изменения" : "Добавить материал"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Название материала" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Например, Цемент М400"
            className={cn(inputClass, errors.name && errorInputClass)}
          />
        </Field>

        <Field label="Категория">
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.category}
            onValueChange={(v) => update("category", v)}
            options={MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>

        <Field label="Поставщик">
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.supplier}
            onValueChange={(v) => update("supplier", v)}
            options={MATERIAL_SUPPLIERS.map((s) => ({ value: s, label: s }))}
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

        <Field label="Единица измерения">
          <input
            type="text"
            value={form.unit}
            onChange={(e) => update("unit", e.target.value)}
            placeholder="мешок, тонна, м³..."
            className={inputClass}
          />
        </Field>

        <Field label="Описание единицы">
          <input
            type="text"
            value={form.unitDetail}
            onChange={(e) => update("unitDetail", e.target.value)}
            placeholder="Например, 50 кг"
            className={inputClass}
          />
        </Field>

        <Field label="Текущий остаток" error={errors.stock}>
          <input
            type="number"
            min={0}
            step="any"
            value={form.stock}
            onChange={(e) => update("stock", e.target.value)}
            className={cn(inputClass, errors.stock && errorInputClass)}
          />
        </Field>

        <Field label="Минимальный остаток" error={errors.minStock}>
          <input
            type="number"
            min={0}
            step="any"
            value={form.minStock}
            onChange={(e) => update("minStock", e.target.value)}
            className={cn(inputClass, errors.minStock && errorInputClass)}
          />
        </Field>

        <Field label="Цена за единицу, сомони" error={errors.price}>
          <input
            type="number"
            min={0}
            step="any"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            className={cn(inputClass, errors.price && errorInputClass)}
          />
        </Field>

        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink">Изображение материала</p>
          <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-dashed border-border-strong text-center transition-colors hover:bg-[#FAFAF9]">
            {imagePreview ? (
              <img src={imagePreview} alt="Предпросмотр материала" className="h-28 w-28 object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-6">
                <ImagePlus size={22} className="text-ink-muted" />
                <span className="text-sm text-ink-secondary">Нажмите, чтобы загрузить изображение</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e.target.files?.[0])} />
          </label>
        </div>

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
