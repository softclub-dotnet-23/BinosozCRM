import { WorkFormModal } from "./WorkFormModal";
import type { Work } from "../../types";

interface EditWorkModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (work: Work) => void;
  work: Work | null;
  allWorks: Work[];
}

export function EditWorkModal({ open, onClose, onSave, work, allWorks }: EditWorkModalProps) {
  return <WorkFormModal open={open} onClose={onClose} onSave={onSave} allWorks={allWorks} nextCode="" work={work} />;
}
