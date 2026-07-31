import { CheckCircle, Copy, Eye, MoreVertical, PauseCircle, Pencil, Trash2, TrendingUp, UserCog, Users } from "lucide-react";
import { DropdownMenu } from "../ui/DropdownMenu";
import { useLanguage } from "../../context/LanguageContext";
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
  const { strings } = useLanguage();
  const s = strings.works;
  const c = strings.common;
  const isClosed = work.status === "completed" || work.status === "cancelled";
  const allowed = new Set(actions);

  return (
    <DropdownMenu
      trigger={<MoreVertical size={16} />}
      items={[
        ...(allowed.has("open") ? [{ label: c.open, icon: <Eye size={14} />, onClick: () => onAction("open", work) }] : []),
        ...(allowed.has("edit") ? [{ label: c.edit, icon: <Pencil size={14} />, onClick: () => onAction("edit", work) }] : []),
        ...(allowed.has("progress")
          ? [{ label: s.actionProgress, icon: <TrendingUp size={14} />, onClick: () => onAction("progress", work) }]
          : []),
        ...(allowed.has("assignResponsible")
          ? [{ label: s.actionAssignResponsible, icon: <UserCog size={14} />, onClick: () => onAction("assignResponsible", work) }]
          : []),
        ...(allowed.has("assignBrigade")
          ? [{ label: s.actionAssignBrigade, icon: <Users size={14} />, onClick: () => onAction("assignBrigade", work) }]
          : []),
        ...(allowed.has("duplicate") ? [{ label: c.duplicateLabel, icon: <Copy size={14} />, onClick: () => onAction("duplicate", work) }] : []),
        ...(!isClosed && allowed.has("complete")
          ? [{ label: c.completeLabel, icon: <CheckCircle size={14} />, onClick: () => onAction("complete", work) }]
          : []),
        ...(!isClosed && allowed.has("pause")
          ? [{ label: s.actionPause, icon: <PauseCircle size={14} />, onClick: () => onAction("pause", work) }]
          : []),
        ...(allowed.has("delete") ? [{ label: c.delete, icon: <Trash2 size={14} />, onClick: () => onAction("delete", work), danger: true }] : []),
      ]}
    />
  );
}
