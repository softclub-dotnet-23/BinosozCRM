import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { useLanguage } from "../../context/LanguageContext";
import type { Material } from "../../types";

interface MaterialRequestFormModalProps {
  open: boolean;
  materials: Material[];
  onClose: () => void;
  onSubmit: (input: { materialName: string; unit: string; quantity: number; note: string }) => void;
}

export function MaterialRequestFormModal({ open, materials, onClose, onSubmit }: MaterialRequestFormModalProps) {
  const { strings } = useLanguage();
  const s = strings.brigadirMaterials;
  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMaterialName(materials[0]?.name ?? "");
      setQuantity("");
      setNote("");
      setError("");
    }
  }, [open, materials]);

  const selectedMaterial = materials.find((m) => m.name === materialName);

  function handleSubmit() {
    const parsedQuantity = Number(quantity.replace(",", "."));
    if (!selectedMaterial) {
      setError(s.errorSelectMaterial);
      return;
    }
    if (!quantity || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError(s.errorQuantityInvalid);
      return;
    }
    onSubmit({ materialName: selectedMaterial.name, unit: selectedMaterial.unit, quantity: parsedQuantity, note: note.trim() });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={s.createModalTitle}
      description={s.createModalDescription}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {s.cancelButton}
          </Button>
          <Button onClick={handleSubmit}>{s.submitRequestButton}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-secondary">{s.fieldMaterial}</label>
          <div className="mt-1.5">
            <CustomSelect
              searchable
              value={materialName}
              onValueChange={setMaterialName}
              options={materials.map((m) => ({ value: m.name, label: m.name, description: m.category }))}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-secondary">
            {s.fieldQuantity}
            {selectedMaterial ? ` (${selectedMaterial.unit})` : ""}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="20"
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-ink-secondary">
            {s.fieldNote} ({s.fieldNoteOptionalSuffix})
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={s.fieldNotePlaceholder}
            className="mt-1.5 w-full resize-none rounded-[10px] border border-border-strong bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        {error && <p className="text-sm text-red">{error}</p>}
      </div>
    </Modal>
  );
}
