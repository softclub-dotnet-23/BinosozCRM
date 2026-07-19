import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { ATTENDANCE_BRIGADES, ATTENDANCE_EMPLOYEES, ATTENDANCE_OBJECTS, mockAttendance } from "../../data/mockAttendance";
import type { AttendanceRecord, AttendanceStatus } from "../../types";

interface FormState {
  employeeName: string;
  date: string;
  objectName: string;
  brigadeName: string;
  arrivalTime: string;
  departureTime: string;
  status: AttendanceStatus;
  note: string;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Присутствовал" },
  { value: "late", label: "Опоздание" },
  { value: "absent", label: "Отсутствовал" },
];

function rosterEntryFor(employeeName: string) {
  return mockAttendance.find((r) => r.employeeName === employeeName);
}

function emptyForm(): FormState {
  const first = ATTENDANCE_EMPLOYEES[0];
  const roster = rosterEntryFor(first);
  return {
    employeeName: first,
    date: "",
    objectName: roster?.objectName ?? ATTENDANCE_OBJECTS[0],
    brigadeName: roster?.brigadeName ?? "",
    arrivalTime: "",
    departureTime: "",
    status: "present",
    note: "",
  };
}

function toForm(record: AttendanceRecord): FormState {
  return {
    employeeName: record.employeeName,
    date: record.date,
    objectName: record.objectName,
    brigadeName: record.brigadeName ?? "",
    arrivalTime: record.arrivalTime ?? "",
    departureTime: record.departureTime ?? "",
    status: record.status,
    note: record.note,
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface AttendanceFormModalProps {
  open: boolean;
  record: AttendanceRecord | null;
  onClose: () => void;
  onSave: (record: AttendanceRecord) => void;
}

export function AttendanceFormModal({ open, record, onClose, onSave }: AttendanceFormModalProps) {
  const [form, setForm] = useState<FormState>(() => (record ? toForm(record) : emptyForm()));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(record ? toForm(record) : emptyForm());
      setErrors({});
    }
  }, [open, record]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleEmployeeChange(name: string) {
    const roster = rosterEntryFor(name);
    setForm((prev) => ({
      ...prev,
      employeeName: name,
      objectName: roster?.objectName ?? prev.objectName,
      brigadeName: roster?.brigadeName ?? "",
    }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.date) nextErrors.date = "Укажите дату";
    if (form.status !== "absent") {
      if (!form.arrivalTime) nextErrors.arrivalTime = "Укажите время прихода";
      if (!form.departureTime) nextErrors.departureTime = "Укажите время ухода";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const roster = rosterEntryFor(form.employeeName);
    const saved: AttendanceRecord = {
      id: record?.id ?? `att-new-${Date.now()}`,
      date: form.date,
      employeeName: form.employeeName,
      position: roster?.position ?? "",
      brigadeName: form.brigadeName || null,
      brigadeSpecialization: form.brigadeName ? (roster?.brigadeSpecialization ?? null) : null,
      department: form.brigadeName ? null : (roster?.department ?? null),
      objectName: form.objectName,
      city: roster?.city ?? "",
      arrivalTime: form.status === "absent" ? null : form.arrivalTime || null,
      departureTime: form.status === "absent" ? null : form.departureTime || null,
      status: form.status,
      note: form.note.trim(),
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? "Редактировать посещение" : "Добавить посещение"}
      description="Заполните данные о посещении сотрудника"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>Сохранить</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Сотрудник">
          <select value={form.employeeName} onChange={(e) => handleEmployeeChange(e.target.value)} className={inputClass}>
            {ATTENDANCE_EMPLOYEES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Дата" error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={cn(inputClass, errors.date && errorInputClass)}
          />
        </Field>

        <Field label="Объект">
          <select value={form.objectName} onChange={(e) => update("objectName", e.target.value)} className={inputClass}>
            {ATTENDANCE_OBJECTS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Бригада">
          <select value={form.brigadeName} onChange={(e) => update("brigadeName", e.target.value)} className={inputClass}>
            <option value="">Без бригады</option>
            {ATTENDANCE_BRIGADES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Время прихода" error={errors.arrivalTime}>
          <input
            type="time"
            value={form.arrivalTime}
            onChange={(e) => update("arrivalTime", e.target.value)}
            disabled={form.status === "absent"}
            className={cn(inputClass, errors.arrivalTime && errorInputClass, form.status === "absent" && "opacity-50")}
          />
        </Field>

        <Field label="Время ухода" error={errors.departureTime}>
          <input
            type="time"
            value={form.departureTime}
            onChange={(e) => update("departureTime", e.target.value)}
            disabled={form.status === "absent"}
            className={cn(inputClass, errors.departureTime && errorInputClass, form.status === "absent" && "opacity-50")}
          />
        </Field>

        <Field label="Статус">
          <select value={form.status} onChange={(e) => update("status", e.target.value as AttendanceStatus)} className={inputClass}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Примечание">
          <input
            type="text"
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            placeholder="Например, Опоздал на 10 мин"
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
