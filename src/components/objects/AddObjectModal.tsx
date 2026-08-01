import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { OBJECT_TYPE_IMAGE_FALLBACK } from "../../utils/objectImages";
import { useLanguage } from "../../context/LanguageContext";
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

type SelectableObjectType = Exclude<ObjectType, "infrastructure">;

const OBJECT_TYPE_KEYS: SelectableObjectType[] = [
  "residential", "business", "cottage", "warehouse", "school", "clinic", "mall", "service", "hotel", "sport", "factory",
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
  const { strings } = useLanguage();
  const s = strings.objects;
  const c = strings.common;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const OBJECT_TYPE_OPTIONS = OBJECT_TYPE_KEYS.map((value) => ({ value, label: s.objectTypeOptions[value] }));
  const STATUS_OPTIONS: { value: ObjectStatus; label: string }[] = [
    { value: "in_progress", label: c.statusInProgress },
    { value: "at_risk", label: c.statusAtRisk },
    { value: "almost_done", label: c.statusAlmostDone },
    { value: "completed", label: c.statusCompleted },
  ];

  // A data: URL (not URL.createObjectURL) — this object gets persisted to localStorage, and an
  // object URL only lives for the current page session, so it would render as a broken image
  // the moment the page reloads and the same string is read back out of storage.
  function handleImageChange(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = s.errorNameRequired;
    if (!form.city.trim()) nextErrors.city = s.errorCityRequired;
    if (!form.address.trim()) nextErrors.address = s.errorAddressRequired;
    if (!form.foreman.trim()) nextErrors.foreman = s.errorForemanRequired;
    if (!form.startDate) nextErrors.startDate = s.errorStartDateRequired;
    if (!form.deadline) nextErrors.deadline = s.errorDeadlineRequired;
    if (form.startDate && form.deadline && form.deadline < form.startDate) {
      nextErrors.deadline = s.errorDeadlineBeforeStart;
    }
    if (!form.budget || Number(form.budget) <= 0) nextErrors.budget = c.errorBudgetPositive;
    const progressNum = Number(form.progress);
    if (Number.isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      nextErrors.progress = s.errorProgressRange;
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
      title={s.addModalTitle}
      description={s.addModalDescription}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {c.cancelLabel}
          </Button>
          <Button onClick={handleSubmit}>{s.saveObjectButton}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={s.fieldName} error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder={s.fieldNamePlaceholder}
            className={cn(inputClass, errors.name && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldType}>
          <CustomSelect
            className="mt-1.5"
            value={form.objectType}
            onValueChange={(v) => update("objectType", v as ObjectType)}
            options={OBJECT_TYPE_OPTIONS}
          />
        </Field>

        <Field label={s.fieldCity} error={errors.city}>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder={s.fieldCityPlaceholder}
            className={cn(inputClass, errors.city && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldAddress} error={errors.address}>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder={s.fieldAddressPlaceholder}
            className={cn(inputClass, errors.address && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldForeman} error={errors.foreman}>
          <input
            type="text"
            value={form.foreman}
            onChange={(e) => update("foreman", e.target.value)}
            placeholder={s.fieldForemanPlaceholder}
            className={cn(inputClass, errors.foreman && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldStatus}>
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as ObjectStatus)}
            options={STATUS_OPTIONS}
          />
        </Field>

        <Field label={s.fieldStartDate} error={errors.startDate}>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className={cn(inputClass, errors.startDate && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldDeadline} error={errors.deadline}>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            className={cn(inputClass, errors.deadline && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldBudget} error={errors.budget}>
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => update("budget", e.target.value)}
            placeholder="500000"
            className={cn(inputClass, errors.budget && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldProgress} error={errors.progress}>
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
        <p className="text-sm font-medium text-ink">{s.fieldImage}</p>
        <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-dashed border-border-strong text-center transition-colors hover:bg-surface-1">
          {imagePreview ? (
            <img src={imagePreview} alt={s.fieldImagePreviewAlt} className="h-32 w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-6">
              <ImagePlus size={22} className="text-ink-muted" />
              <span className="text-sm text-ink-secondary">{s.fieldImageUploadHint}</span>
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
        <Field label={s.fieldDescription}>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder={s.fieldDescriptionPlaceholder}
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
