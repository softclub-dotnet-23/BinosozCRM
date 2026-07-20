import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { CustomSelect } from "../ui/CustomSelect";
import { mockObjects } from "../../data/mockObjects";
import { mockBrigades } from "../../data/mockBrigades";
import { mockEmployees } from "../../data/mockEmployees";
import { SHIFT_CONFIG } from "../../utils/brigadeStatus";
import { cn } from "../../utils/cn";
import type { BrigadeMemberRole, Employee, EmployeeStatus, WorkShift } from "../../types";

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  specialty: string;
  qualificationGrade: string;
  brigadeId: string;
  memberRole: BrigadeMemberRole;
  objectId: string;
  shift: WorkShift;
  status: EmployeeStatus;
  assignedDate: string;
  comment: string;
}

function emptyForm(): FormState {
  return {
    firstName: "",
    lastName: "",
    phone: "+992 9",
    specialty: "",
    qualificationGrade: "3",
    brigadeId: mockBrigades[0].id,
    memberRole: "worker",
    objectId: mockObjects[0].id,
    shift: "day",
    status: "on_shift",
    assignedDate: new Date().toISOString().slice(0, 10),
    comment: "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";
const TAJIK_PHONE_RE = /^\+992 \d{2} \d{3} ?\d{2} ?\d{2}$|^\+992 9\d{2} \d{2} \d{2} \d{2}$/;

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
}

export function AddEmployeeModal({ open, onClose, onSave }: AddEmployeeModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
    setPhotoPreview(null);
    setPhotoError(null);
  }, [open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handlePhotoChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Выберите файл изображения (JPG, PNG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Размер файла не должен превышать 5 МБ");
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) nextErrors.firstName = "Укажите имя";
    if (!form.lastName.trim()) nextErrors.lastName = "Укажите фамилию";
    if (!TAJIK_PHONE_RE.test(form.phone.trim())) nextErrors.phone = "Формат: +992 XX XXX XX XX";
    else if (mockEmployees.some((e) => e.phone === form.phone.trim())) nextErrors.phone = "Этот номер уже используется";
    if (!form.specialty.trim()) nextErrors.specialty = "Укажите специальность";
    if (!form.brigadeId) nextErrors.brigadeId = "Выберите бригаду";
    const grade = Number(form.qualificationGrade);
    if (Number.isNaN(grade) || grade < 1 || grade > 6) nextErrors.qualificationGrade = "Разряд от 1 до 6";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(asDraft: boolean) {
    if (!asDraft && !validate()) return;
    const brigade = mockBrigades.find((b) => b.id === form.brigadeId);
    const object = mockObjects.find((o) => o.id === form.objectId);
    const employee: Employee = {
      id: `employee-new-${Date.now()}`,
      firstName: form.firstName.trim() || "Новый",
      lastName: form.lastName.trim() || "Сотрудник",
      fullName: `${form.firstName.trim() || "Новый"} ${form.lastName.trim() || "Сотрудник"}`,
      phone: form.phone.trim(),
      specialty: form.specialty.trim() || "Не указана",
      qualificationGrade: Number(form.qualificationGrade) || 3,
      brigadeId: brigade?.id ?? null,
      brigadeName: brigade?.name ?? null,
      memberRole: form.memberRole,
      objectId: object?.id ?? null,
      objectName: object?.name ?? null,
      shift: form.shift,
      status: form.status,
      assignedDate: form.assignedDate,
    };
    onSave(employee);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить сотрудника"
      description="Заполните данные сотрудника и назначьте в бригаду"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="outline" onClick={() => handleSubmit(true)}>
            Сохранить как черновик
          </Button>
          <Button onClick={() => handleSubmit(false)}>Добавить сотрудника</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink">Фото сотрудника</p>
          <div className="mt-1.5 flex items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt="Предпросмотр фото" className="h-16 w-16 shrink-0 rounded-full object-cover" />
            ) : (
              <Avatar name={`${form.firstName || "?"} ${form.lastName || "?"}`} size="md" className="h-16 w-16 text-base" />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Camera size={13} /> {photoPreview ? "Заменить" : "Загрузить фото"}
              </Button>
              {photoPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoPreview(null)}>
                  <X size={13} /> Убрать
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {photoError && <p className="mt-1.5 text-xs text-red">{photoError}</p>}
        </div>

        <Field label="Имя" error={errors.firstName}>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className={cn(inputClass, errors.firstName && errorInputClass)}
          />
        </Field>

        <Field label="Фамилия" error={errors.lastName}>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className={cn(inputClass, errors.lastName && errorInputClass)}
          />
        </Field>

        <Field label="Телефон" error={errors.phone}>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+992 90 123 45 67"
            className={cn(inputClass, errors.phone && errorInputClass)}
          />
        </Field>

        <Field label="Специальность" error={errors.specialty}>
          <input
            type="text"
            value={form.specialty}
            onChange={(e) => update("specialty", e.target.value)}
            placeholder="Например, Бетонщик"
            className={cn(inputClass, errors.specialty && errorInputClass)}
          />
        </Field>

        <Field label="Квалификационный разряд" error={errors.qualificationGrade}>
          <input
            type="number"
            min={1}
            max={6}
            value={form.qualificationGrade}
            onChange={(e) => update("qualificationGrade", e.target.value)}
            className={cn(inputClass, errors.qualificationGrade && errorInputClass)}
          />
        </Field>

        <Field label="Бригада" error={errors.brigadeId}>
          <CustomSelect
            searchable
            error={Boolean(errors.brigadeId)}
            className="mt-1.5"
            value={form.brigadeId}
            onValueChange={(v) => update("brigadeId", v)}
            options={mockBrigades.map((b) => ({ value: b.id, label: b.name }))}
          />
        </Field>

        <Field label="Роль в бригаде">
          <CustomSelect
            className="mt-1.5"
            value={form.memberRole}
            onValueChange={(v) => update("memberRole", v as BrigadeMemberRole)}
            options={[
              { value: "worker", label: "Рабочий" },
              { value: "helper", label: "Разнорабочий" },
              { value: "foreman", label: "Прораб" },
            ]}
          />
        </Field>

        <Field label="Объект">
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.objectId}
            onValueChange={(v) => update("objectId", v)}
            options={mockObjects.map((o) => ({ value: o.id, label: o.name }))}
          />
        </Field>

        <Field label="Смена">
          <CustomSelect
            className="mt-1.5"
            value={form.shift}
            onValueChange={(v) => update("shift", v as WorkShift)}
            options={(Object.keys(SHIFT_CONFIG) as WorkShift[]).map((s) => ({ value: s, label: SHIFT_CONFIG[s].label }))}
          />
        </Field>

        <Field label="Статус">
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as EmployeeStatus)}
            options={[
              { value: "on_shift", label: "На смене" },
              { value: "on_site", label: "На объекте" },
              { value: "available", label: "Свободен" },
              { value: "on_trip", label: "На выезде" },
              { value: "absent", label: "Отсутствует" },
              { value: "on_leave", label: "В отпуске" },
              { value: "sick_leave", label: "На больничном" },
            ]}
          />
        </Field>

        <Field label="Дата назначения">
          <input type="date" value={form.assignedDate} onChange={(e) => update("assignedDate", e.target.value)} className={inputClass} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Комментарий">
            <textarea value={form.comment} onChange={(e) => update("comment", e.target.value)} rows={2} className={inputClass} />
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
