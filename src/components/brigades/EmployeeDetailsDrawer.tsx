import { Calendar, CheckCircle2, Clock, FileText, Pencil, Phone, Repeat, Trash2, Wallet } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { IconSummaryRow } from "../ui/IconSummaryRow";
import { CustomSelect } from "../ui/CustomSelect";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { EmployeeRoleBadge } from "./EmployeeRoleBadge";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { EMPLOYEE_STATUS_CONFIG, SHIFT_CONFIG, employeeStatusLabel, shiftLabel } from "../../utils/brigadeStatus";
import { useLanguage } from "../../context/LanguageContext";
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
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;

  if (!employee) {
    return (
      <Drawer open={open} onClose={onClose} title={s.detailsEmployeeDefaultTitle}>
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
            <Pencil size={14} /> {c.edit}
          </Button>
          <Button variant="outline" onClick={() => onTransfer(employee)}>
            <Repeat size={14} /> {s.actionTransfer}
          </Button>
          <Button
            variant="outline"
            className="col-span-2"
            onClick={() => onChangeShift(employee.id, employee.shift === "day" ? "evening" : "day")}
          >
            <Clock size={14} /> {s.actionChangeShift}
          </Button>
          <Button variant="danger" className="col-span-2" onClick={() => onRemove(employee)}>
            <Trash2 size={14} /> {s.actionRemoveFromBrigade}
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
        <IconSummaryRow icon={Phone} label={c.colPhone} value={employee.phone} />
        <IconSummaryRow icon={Calendar} label={s.fieldAssignedDate} value={formatDateShort(employee.assignedDate)} />
        <IconSummaryRow icon={FileText} label={s.qualificationLabel} value={s.gradeSuffix(employee.qualificationGrade)} />
      </div>

      <div className="my-4 border-t border-border" />

      <div>
        <p className="text-sm font-semibold text-ink">{s.brigadeAndObjectTitle}</p>
        <p className="mt-1 text-sm text-ink">{employee.brigadeName ?? s.noBrigadeAssigned}</p>
        <p className="text-xs text-ink-secondary">{employee.objectName ?? "—"}</p>
        <label className="mt-3 block text-xs text-ink-secondary">
          {s.fieldShift}
          <CustomSelect
            className="mt-1"
            value={employee.shift}
            onValueChange={(v) => onChangeShift(employee.id, v as WorkShift)}
            options={(Object.keys(SHIFT_CONFIG) as WorkShift[]).map((shift) => ({ value: shift, label: shiftLabel(s, shift) }))}
          />
        </label>
        <label className="mt-3 block text-xs text-ink-secondary">
          {c.colStatus}
          <CustomSelect
            className="mt-1"
            value={employee.status}
            onValueChange={(v) => onChangeStatus(employee.id, v as EmployeeStatus)}
            options={(Object.keys(EMPLOYEE_STATUS_CONFIG) as EmployeeStatus[]).map((status) => ({
              value: status,
              label: employeeStatusLabel(s, status),
            }))}
          />
        </label>
      </div>

      <div className="my-4 border-t border-border" />

      <div className="space-y-2.5">
        <IconSummaryRow icon={Clock} label={s.hoursWorkedTitle} value={s.hoursWorkedLabel(hoursWorked)} />
        <IconSummaryRow icon={CheckCircle2} label={s.performanceLabel} value={`${performancePercent}%`} />
        <IconSummaryRow icon={Wallet} label={s.accruedTitle} value={formatCurrency(payrollAmount)} />
      </div>

      <div className="my-4 border-t border-border" />

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <FileText size={14} className="text-ink-muted" /> {s.documentsTitle}
        </p>
        <p className="text-xs text-ink-muted">{s.noDocuments}</p>
      </div>
    </Drawer>
  );
}
