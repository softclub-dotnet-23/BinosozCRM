import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { CustomSelect } from "../ui/CustomSelect";
import { mockBrigades } from "../../data/mockBrigades";
import { cn } from "../../utils/cn";
import type { BrigadeMemberRole, Employee } from "../../types";

interface FormState {
  toBrigadeId: string;
  newRole: BrigadeMemberRole;
  transferDate: string;
  reason: string;
  replaceEmployeeId: string;
  comment: string;
}

function emptyForm(employee: Employee): FormState {
  const fallback = mockBrigades.find((b) => b.id !== employee.brigadeId);
  return {
    toBrigadeId: fallback?.id ?? mockBrigades[0].id,
    newRole: employee.memberRole,
    transferDate: new Date().toISOString().slice(0, 10),
    reason: "",
    replaceEmployeeId: "",
    comment: "",
  };
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const errorInputClass = "border-red focus:border-red focus:ring-red/15";

interface TransferEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  allEmployees: Employee[];
  onConfirm: (employeeId: string, toBrigadeId: string, newRole: BrigadeMemberRole) => void;
}

export function TransferEmployeeModal({ open, onClose, employee, allEmployees, onConfirm }: TransferEmployeeModalProps) {
  const [form, setForm] = useState<FormState>(() => (employee ? emptyForm(employee) : emptyForm(allEmployees[0])));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open || !employee) return;
    setForm(emptyForm(employee));
    setErrors({});
  }, [open, employee]);

  if (!employee) {
    return (
      <Modal open={open} onClose={onClose} title="Перевести сотрудника">
        {null}
      </Modal>
    );
  }

  const currentBrigade = mockBrigades.find((b) => b.id === employee.brigadeId);
  const targetBrigade = mockBrigades.find((b) => b.id === form.toBrigadeId);
  const targetOccupancy = targetBrigade
    ? allEmployees.filter((e) => e.brigadeId === targetBrigade.id).length
    : 0;
  const overCapacity = targetBrigade ? targetOccupancy >= targetBrigade.staffingCapacity : false;
  const hasActiveWork = employee.status === "on_shift" || employee.status === "on_site";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (form.toBrigadeId === employee!.brigadeId) nextErrors.toBrigadeId = "Новая бригада должна отличаться от текущей";
    if (!form.transferDate) nextErrors.transferDate = "Укажите дату перевода";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleConfirm() {
    if (!validate() || !targetBrigade) return;
    onConfirm(employee!.id, targetBrigade.id, form.newRole);
  }

  const replaceCandidates = allEmployees.filter((e) => e.brigadeId === form.toBrigadeId && e.id !== employee.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Перевести сотрудника"
      description="Перемещение сотрудника в другую бригаду"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleConfirm}>Подтвердить перевод</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-[#FAFAF9] px-3.5 py-3">
          <Avatar name={employee.fullName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{employee.fullName}</p>
            <p className="text-xs text-ink-secondary">{employee.specialty}</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-ink">
          Текущая бригада
          <input type="text" value={currentBrigade?.name ?? "—"} disabled className={cn(inputClass, "bg-[#FAFAF9] text-ink-secondary")} />
        </label>

        <label className="block text-sm font-medium text-ink">
          Новая бригада
          <CustomSelect
            searchable
            error={Boolean(errors.toBrigadeId)}
            className="mt-1.5"
            value={form.toBrigadeId}
            onValueChange={(v) => update("toBrigadeId", v)}
            options={mockBrigades.map((b) => ({ value: b.id, label: b.name }))}
          />
          {errors.toBrigadeId && <span className="mt-1 block text-xs font-normal text-red">{errors.toBrigadeId}</span>}
        </label>

        <label className="block text-sm font-medium text-ink">
          Новая роль
          <CustomSelect
            className="mt-1.5"
            value={form.newRole}
            onValueChange={(v) => update("newRole", v as BrigadeMemberRole)}
            options={[
              { value: "worker", label: "Рабочий" },
              { value: "helper", label: "Разнорабочий" },
              { value: "foreman", label: "Прораб" },
            ]}
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Дата перевода
          <input
            type="date"
            value={form.transferDate}
            onChange={(e) => update("transferDate", e.target.value)}
            className={cn(inputClass, errors.transferDate && errorInputClass)}
          />
          {errors.transferDate && <span className="mt-1 block text-xs font-normal text-red">{errors.transferDate}</span>}
        </label>

        <label className="block text-sm font-medium text-ink">
          Причина
          <input type="text" value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="Например, нехватка кадров" className={inputClass} />
        </label>

        {replaceCandidates.length > 0 && (
          <label className="block text-sm font-medium text-ink">
            Заменить другого сотрудника
            <CustomSelect
              searchable
              clearable
              placeholder="Не заменять"
              className="mt-1.5"
              value={form.replaceEmployeeId}
              onValueChange={(v) => update("replaceEmployeeId", v)}
              options={replaceCandidates.map((e) => ({ value: e.id, label: e.fullName }))}
            />
          </label>
        )}

        <label className="block text-sm font-medium text-ink">
          Комментарий
          <textarea value={form.comment} onChange={(e) => update("comment", e.target.value)} rows={2} className={inputClass} />
        </label>

        {(overCapacity || hasActiveWork) && (
          <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3.5 py-3 text-xs text-warning">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              {overCapacity && <p>Целевая бригада укомплектована на пределе штатной численности.</p>}
              {hasActiveWork && <p>У сотрудника есть текущее активное назначение — перевод завершит его участие в нём.</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
