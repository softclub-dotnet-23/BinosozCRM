import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { OBJECT_TYPE_IMAGE_FALLBACK } from "../../utils/objectImages";
import type { ConstructionObject, ObjectStatus, ObjectType } from "../../types";

interface FormState {
  name: string;
  objectType: ObjectType;
  city: string;
  address: string;
  foreman: string;
  startDate: string;
  deadline: string;
  budget: string;
  progress: string;
  status: ObjectStatus;
  description: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  objectType: "residential",
  city: "",
  address: "",
  foreman: "",
  startDate: "",
  deadline: "",
  budget: "",
  progress: "0",
  status: "in_progress",
  description: "",
};

const OBJECT_TYPE_OPTIONS: { value: ObjectType; label: string }[] = [
  { value: "residential", label: "Жилой комплекс" },
  { value: "business", label: "Бизнес-центр" },
  { value: "cottage", label: "Коттедж" },
  { value: "warehouse", label: "Складской комплекс" },
  { value: "school", label: "Школа / образование" },
  { value: "clinic", label: "Медицинская клиника" },
  { value: "mall", label: "Торговый центр" },
  { value: "service", label: "Автосервис" },
  { value: "hotel", label: "Гостиница" },
  { value: "sport", label: "Спортивный комплекс" },
  { value: "factory", label: "Производственный цех" },
];

const STATUS_OPTIONS: { value: ObjectStatus; label: string }[] = [
  { value: "in_progress", label: "В работе" },
  { value: "at_risk", label: "Есть риск" },
  { value: "almost_done", label: "Почти готов" },
  { value: "completed", label: "Завершён" },
];

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface AddObjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (object: ConstructionObject) => void;
}

export function AddObjectModal({ open, onClose, onCreate }: AddObjectModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(file: File | undefined) {
    if (!file) return;
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Укажите название объекта";
    if (!form.city.trim()) nextErrors.city = "Укажите город";
    if (!form.address.trim()) nextErrors.address = "Укажите адрес";
    if (!form.foreman.trim()) nextErrors.foreman = "Укажите прораба";
    if (!form.startDate) nextErrors.startDate = "Укажите дату начала";
    if (!form.deadline) nextErrors.deadline = "Укажите крайний срок";
    if (form.startDate && form.deadline && form.deadline < form.startDate) {
      nextErrors.deadline = "Срок не может быть раньше даты начала";
    }
    if (!form.budget || Number(form.budget) <= 0) nextErrors.budget = "Укажите бюджет больше нуля";
    const progressNum = Number(form.progress);
    if (Number.isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      nextErrors.progress = "Прогресс должен быть от 0 до 100";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const budgetNum = Number(form.budget);
    const progressNum = Number(form.progress);
    const newObject: ConstructionObject = {
      id: `obj-${Date.now()}`,
      name: form.name.trim(),
      objectType: form.objectType,
      imageUrl: imagePreview ?? OBJECT_TYPE_IMAGE_FALLBACK[form.objectType],
      city: form.city.trim(),
      address: form.address.trim(),
      foreman: form.foreman.trim(),
      progress: progressNum,
      budget: budgetNum,
      spent: Math.round((budgetNum * progressNum) / 100),
      startDate: form.startDate,
      deadline: form.deadline,
      status: form.status,
      description: form.description.trim(),
    };
    onCreate(newObject);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setErrors({});
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить объект"
      description="Заполните основные данные строительного объекта"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>Сохранить объект</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Название объекта" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Например, Жилой комплекс «Заря»"
            className={cn(inputClass, errors.name && errorInputClass)}
          />
        </Field>

        <Field label="Тип объекта">
          <CustomSelect
            className="mt-1.5"
            value={form.objectType}
            onValueChange={(v) => update("objectType", v as ObjectType)}
            options={OBJECT_TYPE_OPTIONS}
          />
        </Field>

        <Field label="Город" error={errors.city}>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Например, Душанбе"
            className={cn(inputClass, errors.city && errorInputClass)}
          />
        </Field>

        <Field label="Адрес" error={errors.address}>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Улица, дом"
            className={cn(inputClass, errors.address && errorInputClass)}
          />
        </Field>

        <Field label="Прораб" error={errors.foreman}>
          <input
            type="text"
            value={form.foreman}
            onChange={(e) => update("foreman", e.target.value)}
            placeholder="ФИО прораба"
            className={cn(inputClass, errors.foreman && errorInputClass)}
          />
        </Field>

        <Field label="Статус">
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as ObjectStatus)}
            options={STATUS_OPTIONS}
          />
        </Field>

        <Field label="Дата начала" error={errors.startDate}>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className={cn(inputClass, errors.startDate && errorInputClass)}
          />
        </Field>

        <Field label="Крайний срок" error={errors.deadline}>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            className={cn(inputClass, errors.deadline && errorInputClass)}
          />
        </Field>

        <Field label="Общий бюджет, сомони" error={errors.budget}>
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => update("budget", e.target.value)}
            placeholder="500000"
            className={cn(inputClass, errors.budget && errorInputClass)}
          />
        </Field>

        <Field label="Начальный прогресс, %" error={errors.progress}>
          <input
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => update("progress", e.target.value)}
            className={cn(inputClass, errors.progress && errorInputClass)}
          />
        </Field>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-ink">Изображение объекта</p>
        <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-dashed border-border-strong text-center transition-colors hover:bg-[#FAFAF9]">
          {imagePreview ? (
            <img src={imagePreview} alt="Предпросмотр объекта" className="h-32 w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-6">
              <ImagePlus size={22} className="text-ink-muted" />
              <span className="text-sm text-ink-secondary">Нажмите, чтобы загрузить изображение</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageChange(e.target.files?.[0])}
          />
        </label>
      </div>

      <div className="mt-4">
        <Field label="Описание">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder="Краткое описание объекта и объёма работ"
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
