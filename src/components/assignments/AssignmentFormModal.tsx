import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { mockObjects } from "../../data/mockObjects";
import { mockBrigades } from "../../data/mockAssignments";
import { ASSIGNMENT_STATUS_CONFIG } from "../../utils/financeStatus";
import type { Assignment, AssignmentStatus } from "../../types";

interface FormState {
  objectId: string;
  workTitle: string;
  brigadeId: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  status: AssignmentStatus;
  progress: string;
}

function emptyForm(): FormState {
  return {
    objectId: mockObjects[0].id,
    workTitle: "",
    brigadeId: mockBrigades[0].id,
    periodStart: "",
    periodEnd: "",
    amount: "",
    status: "active",
    progress: "0",
  };
}

function formFromAssignment(assignment: Assignment): FormState {
  return {
    objectId: assignment.objectId,
    workTitle: assignment.workTitle,
    brigadeId: assignment.brigadeId,
    periodStart: assignment.periodStart,
    periodEnd: assignment.periodEnd,
    amount: String(assignment.amount),
    status: assignment.status,
    progress: String(assignment.progress),
  };
}

const STATUS_OPTIONS: { value: AssignmentStatus; label: string }[] = (
  ["active", "completed", "overdue", "cancelled"] as const
).map((value) => ({ value, label: ASSIGNMENT_STATUS_CONFIG[value].label }));

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface AssignmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (assignment: Assignment) => void;
  assignment?: Assignment | null;
  nextNumber: number;
}

export function AssignmentFormModal({ open, onClose, onSave, assignment, nextNumber }: AssignmentFormModalProps) {
  const [form, setForm] = useState<FormState>(() => (assignment ? formFromAssignment(assignment) : emptyForm()));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setForm(assignment ? formFromAssignment(assignment) : emptyForm());
    setErrors({});
  }, [open, assignment]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.workTitle.trim()) nextErrors.workTitle = "Укажите название работы";
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = "Укажите сумму больше нуля";
    if (!form.periodStart) nextErrors.periodStart = "Укажите начало периода";
    if (!form.periodEnd) nextErrors.periodEnd = "Укажите окончание периода";
    if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart) {
      nextErrors.periodEnd = "Окончание не может быть раньше начала";
    }
    const progressNum = Number(form.progress);
    if (Number.isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      nextErrors.progress = "Прогресс от 0 до 100";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const object = mockObjects.find((o) => o.id === form.objectId);
    const brigade = mockBrigades.find((b) => b.id === form.brigadeId);
    if (!object || !brigade) return;

    const saved: Assignment = {
      id: assignment?.id ?? `assignment-new-${Date.now()}`,
      number: assignment?.number ?? nextNumber,
      objectId: object.id,
      objectName: object.name,
      objectType: object.objectType,
      imageUrl: object.imageUrl,
      workTitle: form.workTitle.trim(),
      brigadeId: brigade.id,
      brigadeName: brigade.name,
      foremanName: brigade.foremanName,
      foremanRole: "Прораб",
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      amount: Number(form.amount),
      status: form.status,
      progress: Number(form.progress),
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignment ? "Редактировать назначение" : "Создать назначение"}
      description="Назначьте бригаду и прораба на объект и работу"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>{assignment ? "Сохранить изменения" : "Создать назначение"}</Button>
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

        <Field label="Бригада">
          <select value={form.brigadeId} onChange={(e) => update("brigadeId", e.target.value)} className={inputClass}>
            {mockBrigades.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.foremanName}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Работа" error={errors.workTitle}>
            <input
              type="text"
              value={form.workTitle}
              onChange={(e) => update("workTitle", e.target.value)}
              placeholder="Например, Устройство фундамента"
              className={cn(inputClass, errors.workTitle && errorInputClass)}
            />
          </Field>
        </div>

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

        <Field label="Сумма, сомони" error={errors.amount}>
          <input
            type="number"
            min={0}
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="150000"
            className={cn(inputClass, errors.amount && errorInputClass)}
          />
        </Field>

        <Field label="Статус">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as AssignmentStatus)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Прогресс, %" error={errors.progress}>
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
