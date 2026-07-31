import { Clock3, Eye, MoreVertical, Pencil, Repeat, Trash2, UserCog, Wrench } from "lucide-react";
import { DropdownMenu } from "../ui/DropdownMenu";
import { useLanguage } from "../../context/LanguageContext";
import type { Employee } from "../../types";

export type EmployeeActionKind = "open" | "edit" | "transfer" | "changeRole" | "changeShift" | "changeStatus" | "remove";

interface EmployeeActionMenuProps {
  employee: Employee;
  onAction: (action: EmployeeActionKind, employee: Employee) => void;
}

export function EmployeeActionMenu({ employee, onAction }: EmployeeActionMenuProps) {
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;
  return (
    <DropdownMenu
      trigger={<MoreVertical size={16} />}
      items={[
        { label: c.open, icon: <Eye size={14} />, onClick: () => onAction("open", employee) },
        { label: c.edit, icon: <Pencil size={14} />, onClick: () => onAction("edit", employee) },
        { label: s.actionTransfer, icon: <Repeat size={14} />, onClick: () => onAction("transfer", employee) },
        { label: s.actionChangeRole, icon: <Wrench size={14} />, onClick: () => onAction("changeRole", employee) },
        { label: s.actionChangeShift, icon: <Clock3 size={14} />, onClick: () => onAction("changeShift", employee) },
        { label: s.actionChangeStatus, icon: <UserCog size={14} />, onClick: () => onAction("changeStatus", employee) },
        { label: s.actionRemoveFromBrigade, icon: <Trash2 size={14} />, onClick: () => onAction("remove", employee), danger: true },
      ]}
    />
  );
}
