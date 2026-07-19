import { Calendar, CheckCircle2, Clock, FileText, Pencil, Phone, Repeat, Trash2, Wallet } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { IconSummaryRow } from "../ui/IconSummaryRow";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { EmployeeRoleBadge } from "./EmployeeRoleBadge";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { SHIFT_CONFIG } from "../../utils/brigadeStatus";
import type { Employee, EmployeeStatus, WorkShift } from "../../types";

interface EmployeeDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: (employee: Employee) => void;
  onTransfer: (employee: Employee) => void;
  onChangeShift: (id: string, shift: WorkShift) => void;
  onChangeStatus: (id: string, status: EmployeeStatus) => void;
  onRemove: (employee: Employee) => void;
}

const DAILY_RATE_BY_GRADE: Record<number, number> = { 1: 180, 2: 210, 3: 260, 4: 320, 5: 380, 6: 440 };

export function EmployeeDetailsDrawer({
  open,
  onClose,
  employee,
  onEdit,
  onTransfer,
  onChangeShift,
  onChangeStatus,
  onRemove,
}: EmployeeDetailsDrawerProps) {
  if (!employee) {
    return (
      <Drawer open={open} onClose={onClose} title="Сотрудник">
        {null}
      </Drawer>
    );
  }

  const daysSinceAssigned = Math.max(
    1,
    Math.round((new Date("2026-07-17T00:00:00").getTime() - new Date(`${employee.assignedDate}T00:00:00`).getTime()) / 86_400_000),
  );
  const hoursWorked = Math.min(daysSinceAssigned, 90) * 8;
  const dailyRate = DAILY_RATE_BY_GRADE[employee.qualificationGrade] ?? 260;
  const payrollAmount = dailyRate * Math.min(daysSinceAssigned, 30);
  const performancePercent = Math.min(100, 55 + employee.qualificationGrade * 8);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={employee.fullName}
      footer={
        <div className="grid w-full grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => onEdit(employee)}>
            <Pencil size={14} /> Редактировать
          </Button>
          <Button variant="outline" onClick={() => onTransfer(employee)}>
            <Repeat size={14} /> Перевести
          </Button>
          <Button
            variant="outline"
            className="col-span-2"
            onClick={() => onChangeShift(employee.id, employee.shift === "day" ? "evening" : "day")}
          >
            <Clock size={14} /> Изменить смену
          </Button>
          <Button variant="danger" className="col-span-2" onClick={() => onRemove(employee)}>
            <Trash2 size={14} /> Удалить из бригады
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center pt-2 text-center">
        <Avatar name={employee.fullName} size="md" className="h-20 w-20 text-xl" />
        <p className="mt-3 text-base font-bold text-ink">{employee.fullName}</p>
        <p className="text-sm text-ink-secondary">{employee.specialty}</p>
        <div className="mt-2 flex items-center gap-2">
          <EmployeeStatusBadge status={employee.status} />
          <EmployeeRoleBadge specialty={employee.specialty} />
        </div>
      </div>

      <div className="my-4 border-t border-border" />

      <div className="space-y-2.5">
        <IconSummaryRow icon={Phone} label="Телефон" value={employee.phone} />
        <IconSummaryRow icon={Calendar} label="Дата назначения" value={formatDateShort(employee.assignedDate)} />
        <IconSummaryRow icon={FileText} label="Квалификация" value={`${employee.qualificationGrade} разряд`} />
      </div>

      <div className="my-4 border-t border-border" />

      <div>
        <p className="text-sm font-semibold text-ink">Бригада и объект</p>
        <p className="mt-1 text-sm text-ink">{employee.brigadeName ?? "Не назначен"}</p>
        <p className="text-xs text-ink-secondary">{employee.objectName ?? "—"}</p>
        <label className="mt-3 block text-xs text-ink-secondary">
          Смена
          <select
            value={employee.shift}
            onChange={(e) => onChangeShift(employee.id, e.target.value as WorkShift)}
            className="mt-1 w-full rounded-[10px] border border-border-strong px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            {(Object.keys(SHIFT_CONFIG) as WorkShift[]).map((s) => (
              <option key={s} value={s}>
                {SHIFT_CONFIG[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs text-ink-secondary">
          Статус
          <select
            value={employee.status}
            onChange={(e) => onChangeStatus(employee.id, e.target.value as EmployeeStatus)}
            className="mt-1 w-full rounded-[10px] border border-border-strong px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="on_shift">На смене</option>
            <option value="on_site">На объекте</option>
            <option value="available">Свободен</option>
            <option value="on_trip">На выезде</option>
            <option value="absent">Отсутствует</option>
            <option value="on_leave">В отпуске</option>
            <option value="sick_leave">На больничном</option>
          </select>
        </label>
      </div>

      <div className="my-4 border-t border-border" />

      <div className="space-y-2.5">
        <IconSummaryRow icon={Clock} label="Отработано часов" value={`${hoursWorked} ч.`} />
        <IconSummaryRow icon={CheckCircle2} label="Показатель эффективности" value={`${performancePercent}%`} />
        <IconSummaryRow icon={Wallet} label="Начислено (30 дней)" value={formatCurrency(payrollAmount)} />
      </div>

      <div className="my-4 border-t border-border" />

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <FileText size={14} className="text-ink-muted" /> Документы
        </p>
        <p className="text-xs text-ink-muted">Нет прикреплённых документов</p>
      </div>
    </Drawer>
  );
}
