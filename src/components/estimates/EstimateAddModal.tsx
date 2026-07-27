import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { ESTIMATE_OBJECT_META } from "../../data/mockEstimates";
import { useLanguage } from "../../context/LanguageContext";
import type { Estimate, EstimateStatus } from "../../types";

interface FormState {
  objectName: string;
  version: string;
  amount: string;
  date: string;
  status: EstimateStatus;
  responsible: string;
}

const EMPTY_FORM: FormState = {
  objectName: Object.keys(ESTIMATE_OBJECT_META)[0],
  version: "v1",
  amount: "",
  date: "",
  status: "draft",
  responsible: "",
};

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface EstimateAddModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (estimate: Estimate) => void;
  nextNumber: string;
}

export function EstimateAddModal({ open, onClose, onCreate, nextNumber }: EstimateAddModalProps) {
  const { strings } = useLanguage();
  const s = strings.estimates;
  const c = strings.common;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const STATUS_OPTIONS: { value: EstimateStatus; label: string }[] = [
    { value: "draft", label: s.statusDraft },
    { value: "pending_review", label: s.statusPendingReview },
    { value: "approved", label: s.statusApproved },
  ];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = s.errorAmountPositive;
    if (!form.date) nextErrors.date = s.errorDateRequired;
    if (!form.responsible.trim()) nextErrors.responsible = s.errorResponsibleRequired;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const meta = ESTIMATE_OBJECT_META[form.objectName];
    const newEstimate: Estimate = {
      id: `estimate-${Date.now()}`,
      number: nextNumber,
      objectName: form.objectName,
      objectType: meta.objectType,
      imageUrl: meta.imageUrl,
      date: form.date,
      updatedDate: form.date,
      version: form.version.trim() || "v1",
      amount: Number(form.amount),
      spent: 0,
      usagePercent: 0,
      status: form.status,
      responsible: form.responsible.trim(),
      responsibleRole: "Прораб",
    };
    onCreate(newEstimate);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={s.addModalTitle}
      description={s.addModalDescription(nextNumber)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {c.cancelLabel}
          </Button>
          <Button onClick={handleSubmit}>{s.newEstimateButton}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={c.colObject}>
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.objectName}
            onValueChange={(v) => update("objectName", v)}
            options={Object.keys(ESTIMATE_OBJECT_META).map((name) => ({ value: name, label: name }))}
          />
        </Field>

        <Field label={s.fieldVersion}>
          <input
            type="text"
            value={form.version}
            onChange={(e) => update("version", e.target.value)}
            placeholder="v1"
            className={inputClass}
          />
        </Field>

        <Field label={s.fieldAmount} error={errors.amount}>
          <input
            type="number"
            min={0}
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="1000000"
            className={cn(inputClass, errors.amount && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldDate} error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={cn(inputClass, errors.date && errorInputClass)}
          />
        </Field>

        <Field label={c.colStatus}>
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as EstimateStatus)}
            options={STATUS_OPTIONS}
          />
        </Field>

        <Field label={s.colResponsible} error={errors.responsible}>
          <input
            type="text"
            value={form.responsible}
            onChange={(e) => update("responsible", e.target.value)}
            placeholder={s.fieldResponsiblePlaceholder}
            className={cn(inputClass, errors.responsible && errorInputClass)}
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
