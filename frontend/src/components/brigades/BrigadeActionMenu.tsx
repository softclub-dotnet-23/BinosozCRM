import { CheckCircle, Copy, Eye, PauseCircle, Pencil, Trash2, UserCog, Users } from "lucide-react";
import { DropdownMenu } from "../ui/DropdownMenu";
import type { Brigade } from "../../types";

export type BrigadeActionKind =
  | "open"
  | "edit"
  | "changeComposition"
  | "assignWork"
  | "changeForeman"
  | "pause"
  | "activate"
  | "duplicate"
  | "delete";

interface BrigadeActionMenuProps {
  brigade: Brigade;
  onAction: (action: BrigadeActionKind, brigade: Brigade) => void;
}

export function BrigadeActionMenu({ brigade, onAction }: BrigadeActionMenuProps) {
  return (
    <DropdownMenu
      trigger={<span className="text-lg leading-none">⋯</span>}
      items={[
        { label: "Открыть", icon: <Eye size={14} />, onClick: () => onAction("open", brigade) },
        { label: "Редактировать", icon: <Pencil size={14} />, onClick: () => onAction("edit", brigade) },
        { label: "Изменить состав", icon: <Users size={14} />, onClick: () => onAction("changeComposition", brigade) },
        { label: "Назначить на работу", icon: <UserCog size={14} />, onClick: () => onAction("assignWork", brigade) },
        { label: "Изменить прораба", icon: <UserCog size={14} />, onClick: () => onAction("changeForeman", brigade) },
        brigade.status === "paused"
          ? { label: "Активировать", icon: <CheckCircle size={14} />, onClick: () => onAction("activate", brigade) }
          : { label: "Поставить на паузу", icon: <PauseCircle size={14} />, onClick: () => onAction("pause", brigade) },
        { label: "Дублировать", icon: <Copy size={14} />, onClick: () => onAction("duplicate", brigade) },
        { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => onAction("delete", brigade), danger: true },
      ]}
    />
  );
}
