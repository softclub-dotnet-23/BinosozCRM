import { CheckCircle, Copy, Eye, PauseCircle, Pencil, Trash2, UserCog, Users } from "lucide-react";
import { DropdownMenu } from "../ui/DropdownMenu";
import { useLanguage } from "../../context/LanguageContext";
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
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;
  return (
    <DropdownMenu
      trigger={<span className="text-lg leading-none">⋯</span>}
      items={[
        { label: c.open, icon: <Eye size={14} />, onClick: () => onAction("open", brigade) },
        { label: c.edit, icon: <Pencil size={14} />, onClick: () => onAction("edit", brigade) },
        { label: s.actionChangeComposition, icon: <Users size={14} />, onClick: () => onAction("changeComposition", brigade) },
        { label: s.actionAssignWork, icon: <UserCog size={14} />, onClick: () => onAction("assignWork", brigade) },
        { label: s.actionChangeForeman, icon: <UserCog size={14} />, onClick: () => onAction("changeForeman", brigade) },
        brigade.status === "paused"
          ? { label: s.actionActivate, icon: <CheckCircle size={14} />, onClick: () => onAction("activate", brigade) }
          : { label: s.actionPauseBrigade, icon: <PauseCircle size={14} />, onClick: () => onAction("pause", brigade) },
        { label: c.duplicateLabel, icon: <Copy size={14} />, onClick: () => onAction("duplicate", brigade) },
        { label: c.delete, icon: <Trash2 size={14} />, onClick: () => onAction("delete", brigade), danger: true },
      ]}
    />
  );
}
