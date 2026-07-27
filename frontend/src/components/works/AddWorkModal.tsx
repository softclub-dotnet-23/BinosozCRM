import { WorkFormModal } from "./WorkFormModal";
import type { Work } from "../../types";

interface AddWorkModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (work: Work) => void;
  allWorks: Work[];
  nextCode: string;
}

export function AddWorkModal({ open, onClose, onSave, allWorks, nextCode }: AddWorkModalProps) {
  return <WorkFormModal open={open} onClose={onClose} onSave={onSave} allWorks={allWorks} nextCode={nextCode} work={null} />;
}
