import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { BRIGADE_OPTIONS, DEPARTMENT_OPTIONS } from "../../data/mockStaff";
import type { StaffCategory, StaffMember, StaffStatus } from "../../types";

type UnitType = "brigade" | "department";

interface FormState {
  fullName: string;
  position: string;
  category: StaffCategory;
  unitType: UnitType;
  brigadeName: string;
  department: string;
  phone: string;
  status: StaffStatus;
  hireDate: string;
  email: string;
  birthDate: string;
  address: string;
  salary: string;
  passportNumber: string;
  inn: string;
}

const CATEGORY_OPTIONS: { value: StaffCategory; label: string }[] = [
  { value: "worker", label: "Рабочий" },
  { value: "engineer", label: "Инженер / ИТР" },
  { value: "admin", label: "Администрация" },
];

const STATUS_OPTIONS: { value: StaffStatus; label: string }[] = [
  { value: "active", label: "Активен" },
  { value: "vacation", label: "Отпуск" },
  { value: "dismissed", label: "Уволен" },
];

function emptyForm(): FormState {
  return {
    fullName: "",
    position: "",
    category: "worker",
    unitType: "brigade",
    brigadeName: BRIGADE_OPTIONS[0].name,
    department: DEPARTMENT_OPTIONS[0],
    phone: "",
    status: "active",
    hireDate: "",
    email: "",
    birthDate: "",
    address: "",
    salary: "",
    passportNumber: "",
    inn: "",
  };
}

function toForm(employee: StaffMember): FormState {
  return {
    fullName: employee.fullName,
    position: employee.position,
    category: employee.category,
    unitType: employee.brigadeName ? "brigade" : "department",
    brigadeName: employee.brigadeName ?? BRIGADE_OPTIONS[0].name,
    department: employee.department ?? DEPARTMENT_OPTIONS[0],
    phone: employee.phone,
    status: employee.status,
    hireDate: employee.hireDate,
    email: employee.email,
    birthDate: employee.birthDate,
    address: employee.address,
    salary: String(employee.salary),
    passportNumber: employee.passportNumber,
    inn: employee.inn,
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface EmployeeFormModalProps {
  open: boolean;
  employee: StaffMember | null;
  onClose: () => void;
  onSave: (employee: StaffMember) => void;
}

export function EmployeeFormModal({ open, employee, onClose, onSave }: EmployeeFormModalProps) {
  const [form, setForm] = useState<FormState>(() => (employee ? toForm(employee) : emptyForm()));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(employee ? toForm(employee) : emptyForm());
      setErrors({});
    }
  }, [open, employee]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Укажите ФИО";
    if (!form.position.trim()) nextErrors.position = "Укажите должность";
    if (!form.phone.trim()) nextErrors.phone = "Укажите телефон";
    if (!form.hireDate) nextErrors.hireDate = "Укажите дату принятия";
    if (!form.email.trim()) nextErrors.email = "Укажите email";
    if (!form.birthDate) nextErrors.birthDate = "Укажите дату рождения";
    if (!form.salary || Number(form.salary) <= 0) nextErrors.salary = "Укажите оклад больше нуля";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const brigade = BRIGADE_OPTIONS.find((b) => b.name === form.brigadeName);
    const saved: StaffMember = {
      id: employee?.id ?? `EMP-${String(9000 + Math.floor(Math.random() * 999)).padStart(4, "0")}`,
      fullName: form.fullName.trim(),
      position: form.position.trim(),
      category: form.category,
      brigadeName: form.unitType === "brigade" ? form.brigadeName : null,
      brigadeSpecialization: form.unitType === "brigade" ? (brigade?.specialization ?? null) : null,
      department: form.unitType === "department" ? form.department : null,
      phone: form.phone.trim(),
      status: form.status,
      hireDate: form.hireDate,
      email: form.email.trim(),
      birthDate: form.birthDate,
      address: form.address.trim(),
      employmentType: employee?.employmentType ?? "Полная занятость",
      salary: Number(form.salary),
      passportNumber: form.passportNumber.trim() || (employee?.passportNumber ?? "AA0000000"),
      inn: form.inn.trim() || (employee?.inn ?? "0000000000000"),
      hasContract: employee?.hasContract ?? true,
    };
    onSave(saved);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? "Редактировать сотрудника" : "Добавить сотрудника"}
      description="Заполните основные данные сотрудника"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>{employee ? "Сохранить изменения" : "Добавить сотрудника"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ФИО" error={errors.fullName}>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder="Например, Мирзоев Шахром"
            className={cn(inputClass, errors.fullName && errorInputClass)}
          />
        </Field>

        <Field label="Должность" error={errors.position}>
          <input
            type="text"
            value={form.position}
            onChange={(e) => update("position", e.target.value)}
            placeholder="Например, Прораб"
            className={cn(inputClass, errors.position && errorInputClass)}
          />
        </Field>

        <Field label="Категория">
          <CustomSelect
            className="mt-1.5"
            value={form.category}
            onValueChange={(v) => update("category", v as StaffCategory)}
            options={CATEGORY_OPTIONS}
          />
        </Field>

        <Field label="Статус">
          <CustomSelect
            className="mt-1.5"
            value={form.status}
            onValueChange={(v) => update("status", v as StaffStatus)}
            options={STATUS_OPTIONS}
          />
        </Field>

        <Field label="Тип подразделения">
          <CustomSelect
            className="mt-1.5"
            value={form.unitType}
            onValueChange={(v) => update("unitType", v as UnitType)}
            options={[
              { value: "brigade", label: "Бригада" },
              { value: "department", label: "Отдел" },
            ]}
          />
        </Field>

        {form.unitType === "brigade" ? (
          <Field label="Бригада">
            <CustomSelect
              searchable
              className="mt-1.5"
              value={form.brigadeName}
              onValueChange={(v) => update("brigadeName", v)}
              options={BRIGADE_OPTIONS.map((b) => ({ value: b.name, label: `${b.name} — ${b.specialization}` }))}
            />
          </Field>
        ) : (
          <Field label="Отдел">
            <CustomSelect
              searchable
              className="mt-1.5"
              value={form.department}
              onValueChange={(v) => update("department", v)}
              options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
            />
          </Field>
        )}

        <Field label="Телефон" error={errors.phone}>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+992 90 000 00 00"
            className={cn(inputClass, errors.phone && errorInputClass)}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="name@example.com"
            className={cn(inputClass, errors.email && errorInputClass)}
          />
        </Field>

        <Field label="Дата рождения" error={errors.birthDate}>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            className={cn(inputClass, errors.birthDate && errorInputClass)}
          />
        </Field>

        <Field label="Дата принятия" error={errors.hireDate}>
          <input
            type="date"
            value={form.hireDate}
            onChange={(e) => update("hireDate", e.target.value)}
            className={cn(inputClass, errors.hireDate && errorInputClass)}
          />
        </Field>

        <Field label="Адрес">
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="г. Душанбе, ул. Рудаки 123"
            className={inputClass}
          />
        </Field>

        <Field label="Оклад, сомони" error={errors.salary}>
          <input
            type="number"
            min={0}
            value={form.salary}
            onChange={(e) => update("salary", e.target.value)}
            placeholder="5000"
            className={cn(inputClass, errors.salary && errorInputClass)}
          />
        </Field>

        <Field label="Паспорт">
          <input
            type="text"
            value={form.passportNumber}
            onChange={(e) => update("passportNumber", e.target.value)}
            placeholder="AA1234567"
            className={inputClass}
          />
        </Field>

        <Field label="ИНН">
          <input
            type="text"
            value={form.inn}
            onChange={(e) => update("inn", e.target.value)}
            placeholder="1234567890123"
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
