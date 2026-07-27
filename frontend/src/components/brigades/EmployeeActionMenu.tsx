import { Clock3, Eye, Pencil, Repeat, Trash2, UserCog, Wrench } from "lucide-react";
import { DropdownMenu } from "../ui/DropdownMenu";
import type { Employee } from "../../types";

export type EmployeeActionKind = "open" | "edit" | "transfer" | "changeRole" | "changeShift" | "changeStatus" | "remove";

interface EmployeeActionMenuProps {
  employee: Employee;
  onAction: (action: EmployeeActionKind, employee: Employee) => void;
}

export function EmployeeActionMenu({ employee, onAction }: EmployeeActionMenuProps) {
  return (
    <DropdownMenu
      trigger={<span className="text-lg leading-none">⋯</span>}
      items={[
        { label: "Открыть", icon: <Eye size={14} />, onClick: () => onAction("open", employee) },
        { label: "Редактировать", icon: <Pencil size={14} />, onClick: () => onAction("edit", employee) },
        { label: "Перевести", icon: <Repeat size={14} />, onClick: () => onAction("transfer", employee) },
        { label: "Изменить роль", icon: <Wrench size={14} />, onClick: () => onAction("changeRole", employee) },
        { label: "Изменить смену", icon: <Clock3 size={14} />, onClick: () => onAction("changeShift", employee) },
        { label: "Изменить статус", icon: <UserCog size={14} />, onClick: () => onAction("changeStatus", employee) },
        { label: "Удалить из бригады", icon: <Trash2 size={14} />, onClick: () => onAction("remove", employee), danger: true },
      ]}
    />
  );
}
