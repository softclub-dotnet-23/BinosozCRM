import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { CustomSelect } from "../ui/CustomSelect";
import { mockObjects } from "../../data/mockObjects";
import { mockBrigades } from "../../data/mockBrigades";
import { mockEmployees } from "../../data/mockEmployees";
import { EMPLOYEE_STATUS_CONFIG, SHIFT_CONFIG, employeeStatusLabel, shiftLabel } from "../../utils/brigadeStatus";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";
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
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;
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
      setPhotoError(s.errorPhotoType);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(s.errorPhotoSize);
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) nextErrors.firstName = s.errorFirstNameRequired;
    if (!form.lastName.trim()) nextErrors.lastName = s.errorLastNameRequired;
    if (!TAJIK_PHONE_RE.test(form.phone.trim())) nextErrors.phone = s.errorPhoneFormat;
    else if (mockEmployees.some((e) => e.phone === form.phone.trim())) nextErrors.phone = s.errorPhoneTaken;
    if (!form.specialty.trim()) nextErrors.specialty = s.errorSpecialtyRequired;
    if (!form.brigadeId) nextErrors.brigadeId = s.errorBrigadeRequired;
    const grade = Number(form.qualificationGrade);
    if (Number.isNaN(grade) || grade < 1 || grade > 6) nextErrors.qualificationGrade = s.errorGradeRange;
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
      title={s.addEmployeeModalTitle}
      description={s.addEmployeeModalDescription}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {c.cancelLabel}
          </Button>
          <Button variant="outline" onClick={() => handleSubmit(true)}>
            {s.saveDraftButton}
          </Button>
          <Button onClick={() => handleSubmit(false)}>{s.addEmployeeButton}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink">{s.photoLabel}</p>
          <div className="mt-1.5 flex items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt={s.photoPreviewAlt} className="h-16 w-16 shrink-0 rounded-full object-cover" />
            ) : (
              <Avatar name={`${form.firstName || "?"} ${form.lastName || "?"}`} size="md" className="h-16 w-16 text-base" />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Camera size={13} /> {photoPreview ? s.replacePhotoButton : s.uploadPhotoButton}
              </Button>
              {photoPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoPreview(null)}>
                  <X size={13} /> {s.removePhotoButton}
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

        <Field label={s.fieldFirstName} error={errors.firstName}>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className={cn(inputClass, errors.firstName && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldLastName} error={errors.lastName}>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className={cn(inputClass, errors.lastName && errorInputClass)}
          />
        </Field>

        <Field label={c.colPhone} error={errors.phone}>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+992 90 123 45 67"
            className={cn(inputClass, errors.phone && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldSpecialty} error={errors.specialty}>
          <input
            type="text"
            value={form.specialty}
            onChange={(e) => update("specialty", e.target.value)}
            placeholder={s.fieldSpecialtyPlaceholder}
            className={cn(inputClass, errors.specialty && errorInputClass)}
          />
        </Field>

        <Field label={s.fieldGrade} error={errors.qualificationGrade}>
          <input
            type="number"
            min={1}
            max={6}
            value={form.qualificationGrade}
            onChange={(e) => update("qualificationGrade", e.target.value)}
            className={cn(inputClass, errors.qualificationGrade && errorInputClass)}
          />
        </Field>

        <Field label={c.colBrigade} error={errors.brigadeId}>
          <CustomSelect
            searchable
            error={Boolean(errors.brigadeId)}
            className="mt-1.5"
            value={form.brigadeId}
            onValueChange={(v) => update("brigadeId", v)}
            options={mockBrigades.map((b) => ({ value: b.id, label: b.name }))}
          />
        </Field>

        <Field label={s.fieldMemberRole}>
          <CustomSelect
            className="mt-1.5"
            value={form.memberRole}
            onValueChange={(v) => update("memberRole", v as BrigadeMemberRole)}
            options={[
              { value: "worker", label: s.roleWorker },
              { value: "helper", label: s.roleHelper },
              { value: "brigadir", label: s.roleBrigadir },
              { value: "foreman", label: s.roleForeman },
            ]}
          />
        </Field>

        <Field label={c.colObject}>
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.objectId}
            onValueChange={(v) => update("objectId", v)}
            options={mockObjects.map((o) => ({ value: o.id, label: o.name }))}
          />
        </Field>

        <Field label={s.fieldShift}>
          <CustomSelect
            className="mt-1.5"
            value={form.shift}
            onValueChange={(v) => update("shift", v as WorkShift)}
            options={(Object.keys(SHIFT_CONFIG) as WorkShift[]).map((shift) => ({ value: shift, label: shiftLabel(s, shift) }))}
          />
        </Field>

        <Field label={c.colStatus}>
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as EmployeeStatus)}
            options={(Object.keys(EMPLOYEE_STATUS_CONFIG) as EmployeeStatus[]).map((status) => ({
              value: status,
              label: employeeStatusLabel(s, status),
            }))}
          />
        </Field>

        <Field label={s.fieldAssignedDate}>
          <input type="date" value={form.assignedDate} onChange={(e) => update("assignedDate", e.target.value)} className={inputClass} />
        </Field>

        <div className="sm:col-span-2">
          <Field label={c.commentLabel}>
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
