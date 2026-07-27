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
  /** Restricts which actions render, e.g. for roles without Prorab/Admin-level management rights. Defaults to the full set. */
  actions?: WorkActionKind[];
}

const ALL_ACTIONS: WorkActionKind[] = [
  "open",
  "edit",
  "progress",
  "assignResponsible",
  "assignBrigade",
  "duplicate",
  "complete",
  "pause",
  "delete",
];

export function WorkActionMenu({ work, onAction, actions = ALL_ACTIONS }: WorkActionMenuProps) {
  const isClosed = work.status === "completed" || work.status === "cancelled";
  const allowed = new Set(actions);

  return (
    <DropdownMenu
      trigger={<span className="text-lg leading-none">⋯</span>}
      items={[
        ...(allowed.has("open") ? [{ label: "Открыть", icon: <Eye size={14} />, onClick: () => onAction("open", work) }] : []),
        ...(allowed.has("edit") ? [{ label: "Редактировать", icon: <Pencil size={14} />, onClick: () => onAction("edit", work) }] : []),
        ...(allowed.has("progress")
          ? [{ label: "Изменить прогресс", icon: <TrendingUp size={14} />, onClick: () => onAction("progress", work) }]
          : []),
        ...(allowed.has("assignResponsible")
          ? [{ label: "Назначить ответственного", icon: <UserCog size={14} />, onClick: () => onAction("assignResponsible", work) }]
          : []),
        ...(allowed.has("assignBrigade")
          ? [{ label: "Назначить бригаду", icon: <Users size={14} />, onClick: () => onAction("assignBrigade", work) }]
          : []),
        ...(allowed.has("duplicate") ? [{ label: "Дублировать", icon: <Copy size={14} />, onClick: () => onAction("duplicate", work) }] : []),
        ...(!isClosed && allowed.has("complete")
          ? [{ label: "Завершить", icon: <CheckCircle size={14} />, onClick: () => onAction("complete", work) }]
          : []),
        ...(!isClosed && allowed.has("pause")
          ? [{ label: "Приостановить", icon: <PauseCircle size={14} />, onClick: () => onAction("pause", work) }]
          : []),
        ...(allowed.has("delete") ? [{ label: "Удалить", icon: <Trash2 size={14} />, onClick: () => onAction("delete", work), danger: true }] : []),
      ]}
    />
  );
}
