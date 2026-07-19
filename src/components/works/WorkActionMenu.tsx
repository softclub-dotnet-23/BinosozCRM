import { CheckCircle, Copy, Eye, PauseCircle, Pencil, Trash2, TrendingUp, UserCog, Users } from "lucide-react";
import { DropdownMenu } from "../ui/DropdownMenu";
import type { Work } from "../../types";

export type WorkActionKind =
  | "open"
  | "edit"
  | "progress"
  | "assignResponsible"
  | "assignBrigade"
  | "duplicate"
  | "complete"
  | "pause"
  | "delete";

interface WorkActionMenuProps {
  work: Work;
  onAction: (action: WorkActionKind, work: Work) => void;
}

export function WorkActionMenu({ work, onAction }: WorkActionMenuProps) {
  const isClosed = work.status === "completed" || work.status === "cancelled";

  return (
    <DropdownMenu
      trigger={<span className="text-lg leading-none">⋯</span>}
      items={[
        { label: "Открыть", icon: <Eye size={14} />, onClick: () => onAction("open", work) },
        { label: "Редактировать", icon: <Pencil size={14} />, onClick: () => onAction("edit", work) },
        { label: "Изменить прогресс", icon: <TrendingUp size={14} />, onClick: () => onAction("progress", work) },
        { label: "Назначить ответственного", icon: <UserCog size={14} />, onClick: () => onAction("assignResponsible", work) },
        { label: "Назначить бригаду", icon: <Users size={14} />, onClick: () => onAction("assignBrigade", work) },
        { label: "Дублировать", icon: <Copy size={14} />, onClick: () => onAction("duplicate", work) },
        ...(!isClosed
          ? [
              { label: "Завершить", icon: <CheckCircle size={14} />, onClick: () => onAction("complete", work) },
              { label: "Приостановить", icon: <PauseCircle size={14} />, onClick: () => onAction("pause", work) },
            ]
          : []),
        { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => onAction("delete", work), danger: true },
      ]}
    />
  );
}
