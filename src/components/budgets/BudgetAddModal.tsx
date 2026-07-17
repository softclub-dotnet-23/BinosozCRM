import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { mockObjects } from "../../data/mockObjects";
import type { BudgetLine, BudgetLineStatus } from "../../types";

interface FormState {
  objectId: string;
  totalBudget: string;
  periodStart: string;
  periodEnd: string;
  status: BudgetLineStatus;
}

const EMPTY_FORM: FormState = {
  objectId: mockObjects[0].id,
  totalBudget: "",
  periodStart: "",
  periodEnd: "",
  status: "draft",
};

const STATUS_OPTIONS: { value: BudgetLineStatus; label: string }[] = [
  { value: "draft", label: "Черновик" },
  { value: "pending_approval", label: "На согласовании" },
  { value: "in_progress", label: "В работе" },
  { value: "completed", label: "Завершён" },
];

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface BudgetAddModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (budget: BudgetLine) => void;
}

export function BudgetAddModal({ open, onClose, onCreate }: BudgetAddModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.totalBudget || Number(form.totalBudget) <= 0) nextErrors.totalBudget = "Укажите бюджет больше нуля";
    if (!form.periodStart) nextErrors.periodStart = "Укажите начало периода";
    if (!form.periodEnd) nextErrors.periodEnd = "Укажите окончание периода";
    if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart) {
      nextErrors.periodEnd = "Окончание не может быть раньше начала";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const object = mockObjects.find((o) => o.id === form.objectId);
    if (!object) return;
    const today = new Date().toISOString().slice(0, 10);
    const newBudget: BudgetLine = {
      id: `budget-new-${Date.now()}`,
      objectId: object.id,
      objectName: object.name,
      objectType: object.objectType,
      imageUrl: object.imageUrl,
      totalBudget: Number(form.totalBudget),
      spent: 0,
      status: form.status,
      responsible: object.foreman,
      responsibleRole: "Прораб",
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      createdDate: today,
      updatedDate: today,
    };
    onCreate(newBudget);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить бюджет"
      description="Заполните основные параметры бюджета объекта"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>Сохранить бюджет</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Объект">
          <select value={form.objectId} onChange={(e) => update("objectId", e.target.value)} className={inputClass}>
            {mockObjects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Статус">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as BudgetLineStatus)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Общий бюджет, сомони" error={errors.totalBudget}>
          <input
            type="number"
            min={0}
            value={form.totalBudget}
            onChange={(e) => update("totalBudget", e.target.value)}
            placeholder="500000"
            className={cn(inputClass, errors.totalBudget && errorInputClass)}
          />
        </Field>

        <div />

        <Field label="Начало периода" error={errors.periodStart}>
          <input
            type="date"
            value={form.periodStart}
            onChange={(e) => update("periodStart", e.target.value)}
            className={cn(inputClass, errors.periodStart && errorInputClass)}
          />
        </Field>

        <Field label="Окончание периода" error={errors.periodEnd}>
          <input
            type="date"
            value={form.periodEnd}
            onChange={(e) => update("periodEnd", e.target.value)}
            className={cn(inputClass, errors.periodEnd && errorInputClass)}
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
