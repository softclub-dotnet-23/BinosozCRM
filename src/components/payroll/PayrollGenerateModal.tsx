import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { cn } from "../../utils/cn";
import { employeesRepository, staffRepository, attendanceRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { ResponsiblePersonSelect } from "../materials/ResponsiblePersonField";
import { calculatePayrollRecord, DEFAULT_GENERATION_OPTIONS } from "../../utils/payrollAnalytics";
import { formatCurrency } from "../../utils/format";
import { formatDateRu } from "../../utils/date";
import type { PayrollRecord, StaffMember } from "../../types";

interface FormState {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  brigadeName: string;
  bonuses: string;
  allowances: string;
  advanceDeduction: string;
  otherDeductions: string;
  taxRate: string;
  preparedBy: string;
  note: string;
}

function emptyForm(defaultResponsible: string): FormState {
  return {
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    periodLabel: "Август 2026",
    brigadeName: "all",
    bonuses: "0",
    allowances: "0",
    advanceDeduction: "0",
    otherDeductions: "0",
    taxRate: "8",
    preparedBy: defaultResponsible,
    note: "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface PayrollGenerateModalProps {
  open: boolean;
  existingRecords: PayrollRecord[];
  onClose: () => void;
  onGenerate: (records: PayrollRecord[]) => void;
}

export function PayrollGenerateModal({ open, existingRecords, onClose, onGenerate }: PayrollGenerateModalProps) {
  const employees = useRepositorySnapshot(employeesRepository);
  const staff = useRepositorySnapshot(staffRepository);
  const attendance = useRepositorySnapshot(attendanceRepository);
  const [form, setForm] = useState<FormState>(() => emptyForm(employees[0]?.id ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(employees[0]?.id ?? ""));
      setErrors({});
      setSaving(false);
    }
  }, [open, employees]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const brigadeNames = Array.from(new Set(staff.map((s) => s.brigadeName).filter((v): v is string => Boolean(v)))).sort((a, b) =>
    a.localeCompare(b, "ru"),
  );

  const eligibleStaff: StaffMember[] = staff.filter((s) => {
    if (s.status !== "active") return false;
    if (form.brigadeName !== "all" && s.brigadeName !== form.brigadeName) return false;
    return true;
  });

  const alreadyGenerated = eligibleStaff.filter((s) =>
    existingRecords.some((r) => r.employeeId === s.employeeId && r.periodStart === form.periodStart && r.periodEnd === form.periodEnd),
  );
  const toGenerate = eligibleStaff.filter((s) => !alreadyGenerated.includes(s));

  const previewTotal = toGenerate.reduce((sum, s) => sum + s.salary, 0);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.periodStart) nextErrors.periodStart = "Укажите начало периода";
    if (!form.periodEnd) nextErrors.periodEnd = "Укажите конец периода";
    if (form.periodStart && form.periodEnd && form.periodStart > form.periodEnd) nextErrors.periodEnd = "Конец периода раньше начала";
    if (!form.periodLabel.trim()) nextErrors.periodLabel = "Укажите название периода";
    if (!form.preparedBy) nextErrors.preparedBy = "Укажите ответственного";
    if (toGenerate.length === 0) nextErrors.staff = "Нет сотрудников для начисления за этот период (уже сформировано либо никого не найдено)";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);

    const preparedByName = employees.find((e) => e.id === form.preparedBy)?.fullName ?? form.preparedBy;
    const options = {
      ...DEFAULT_GENERATION_OPTIONS,
      bonuses: Number(form.bonuses) || 0,
      allowances: Number(form.allowances) || 0,
      advanceDeduction: Number(form.advanceDeduction) || 0,
      otherDeductions: Number(form.otherDeductions) || 0,
      taxRate: (Number(form.taxRate) || 0) / 100,
    };

    const maxNumber = existingRecords.length > 0 ? Math.max(...existingRecords.map((r) => r.number)) : 0;
    const records = toGenerate.map((s, i) =>
      calculatePayrollRecord({
        staff: s,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        periodLabel: form.periodLabel.trim(),
        attendance,
        options,
        preparedBy: preparedByName,
        number: maxNumber + i + 1,
      }),
    );

    onGenerate(records);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Сформировать зарплату"
      description="Расчёт начислений и удержаний за выбранный период"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            Сформировать ({toGenerate.length})
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Начало периода" error={errors.periodStart}>
          <input
            type="date"
            value={form.periodStart}
            onChange={(e) => update("periodStart", e.target.value)}
            className={cn(inputClass, errors.periodStart && errorInputClass)}
          />
        </Field>
        <Field label="Конец периода" error={errors.periodEnd}>
          <input
            type="date"
            value={form.periodEnd}
            onChange={(e) => update("periodEnd", e.target.value)}
            className={cn(inputClass, errors.periodEnd && errorInputClass)}
          />
        </Field>
        <Field label="Название периода" error={errors.periodLabel}>
          <input
            type="text"
            value={form.periodLabel}
            onChange={(e) => update("periodLabel", e.target.value)}
            placeholder="Август 2026"
            className={cn(inputClass, errors.periodLabel && errorInputClass)}
          />
        </Field>
        <Field label="Бригада / отдел">
          <CustomSelect
            searchable
            className="mt-1.5"
            value={form.brigadeName}
            onValueChange={(v) => update("brigadeName", v)}
            options={[{ value: "all", label: "Все сотрудники" }, ...brigadeNames.map((b) => ({ value: b, label: b }))]}
          />
        </Field>
        <Field label="Премии (всем, сомони)">
          <input type="number" min={0} value={form.bonuses} onChange={(e) => update("bonuses", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Надбавки (всем, сомони)">
          <input type="number" min={0} value={form.allowances} onChange={(e) => update("allowances", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Аванс (удержание, сомони)">
          <input
            type="number"
            min={0}
            value={form.advanceDeduction}
            onChange={(e) => update("advanceDeduction", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Ставка налога, %">
          <input type="number" min={0} max={100} value={form.taxRate} onChange={(e) => update("taxRate", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Ответственный" error={errors.preparedBy}>
          <ResponsiblePersonSelect
            employees={employees}
            value={form.preparedBy}
            onChange={(value) => update("preparedBy", value)}
            error={Boolean(errors.preparedBy)}
          />
        </Field>
        <Field label="Примечание">
          <input type="text" value={form.note} onChange={(e) => update("note", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="mt-4 rounded-[10px] bg-[#F5F5F4] px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-secondary">Будет начислено сотрудникам</span>
          <span className="font-bold text-ink tabular">{toGenerate.length}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-ink-secondary">Оклад (база), итого</span>
          <span className="font-bold text-primary tabular">{formatCurrency(previewTotal)}</span>
        </div>
        {alreadyGenerated.length > 0 && (
          <p className="mt-2 text-xs text-warning">
            Пропущено (уже есть расчёт за {formatDateRu(form.periodStart)} – {formatDateRu(form.periodEnd)}): {alreadyGenerated.length}
          </p>
        )}
        {errors.staff && <p className="mt-2 text-xs text-red">{errors.staff}</p>}
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
