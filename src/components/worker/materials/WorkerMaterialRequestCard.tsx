import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { CustomSelect } from "../../ui/CustomSelect";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { useToast } from "../../../hooks/useToast";
import { useWorkerScope } from "../../../utils/workerAccess";
import { useRepositorySnapshot } from "../../../hooks/useRepositoryState";
import { materialRequestsRepository } from "../../../data/repositories";
import { buildMaterialRequest, nextMaterialRequestNumber } from "../../../utils/materialRequests";
import { MATERIAL_CATEGORIES } from "../../../data/mockMaterials";
import type { Material } from "../../../types";

interface WorkerMaterialRequestCardProps {
  materials: Material[];
  selectedMaterialId: string | null;
  onSubmitted: () => void;
}

export function WorkerMaterialRequestCard({ materials, selectedMaterialId, onSubmitted }: WorkerMaterialRequestCardProps) {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee, brigade, object } = useWorkerScope(user);
  const requests = useRepositorySnapshot(materialRequestsRepository);

  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (selectedMaterialId) setMaterialId(selectedMaterialId);
  }, [selectedMaterialId]);

  const selectedMaterial = useMemo(() => materials.find((m) => m.id === materialId) ?? null, [materials, materialId]);

  const materialOptions = useMemo(
    () =>
      MATERIAL_CATEGORIES.map((category) => ({
        label: category,
        options: materials.filter((m) => m.category === category).map((m) => ({ value: m.id, label: m.name })),
      })).filter((g) => g.options.length > 0),
    [materials],
  );

  const qty = Number(quantity);
  const materialError = touched && !materialId ? s.materialsErrorMaterialRequired : null;
  const qtyError = touched && (!quantity || qty <= 0) ? s.materialsErrorQtyRequired : null;

  async function handleSubmit() {
    setTouched(true);
    if (!employee || !selectedMaterial || !quantity || qty <= 0 || submitting) return;
    setSubmitting(true);
    await materialRequestsRepository.create(
      buildMaterialRequest(
        {
          materialName: selectedMaterial.name,
          quantity: qty,
          unit: selectedMaterial.unit,
          objectName: object?.name ?? "—",
          brigadeName: brigade?.name ?? "—",
          requestedBy: employee.fullName,
          note: comment.trim(),
        },
        nextMaterialRequestNumber(requests),
      ),
    );
    setSubmitting(false);
    showToast(s.toastMaterialRequested, "success");
    setMaterialId("");
    setQuantity("");
    setComment("");
    setTouched(false);
    onSubmitted();
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.materialsRequestCardTitle}</h2>
      <div className="mt-3.5 space-y-3">
        <div>
          <CustomSelect
            value={materialId}
            onValueChange={(v) => setMaterialId(v)}
            options={materialOptions}
            placeholder={s.materialsRequestMaterialPlaceholder}
            searchable
            error={!!materialError}
            aria-label={s.materialsRequestMaterialPlaceholder}
          />
          {materialError && <p className="mt-1 text-xs text-red">{materialError}</p>}
        </div>

        <div>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={s.materialsRequestQtyPlaceholder}
            aria-label={s.materialsRequestQtyPlaceholder}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          {qtyError && <p className="mt-1 text-xs text-red">{qtyError}</p>}
        </div>

        <input
          disabled
          value={selectedMaterial ? selectedMaterial.unit : ""}
          placeholder={s.materialsRequestUnitPlaceholder}
          aria-label={s.materialsRequestUnitPlaceholder}
          className="h-10 w-full rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm text-ink-secondary placeholder:text-ink-muted"
        />

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={s.materialsRequestCommentPlaceholder}
          rows={2}
          className="w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />

        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          {s.materialModalSubmit}
        </Button>
      </div>
    </Card>
  );
}
