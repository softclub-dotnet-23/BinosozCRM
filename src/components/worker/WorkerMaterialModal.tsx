import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { materialRequestsRepository } from "../../data/repositories";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";

interface WorkerMaterialModalProps {
  open: boolean;
  onClose: () => void;
  defaultWorkId?: string | null;
}

/** Reuses the same MaterialRequest shape/document-numbering convention as
 * BrigadirMaterialsPage's request form — one real repository, one real numbering scheme, scoped
 * here to the worker's own object/brigade (a worker can only request for their own site).
 * MaterialRequest has no workId field (shared across the whole app, not worth widening for this
 * one page), so the related task is folded into the real `note` field instead of inventing a new
 * relation on an existing, already-consumed type. */
export function WorkerMaterialModal({ open, onClose, defaultWorkId = null }: WorkerMaterialModalProps) {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee, brigade, object, brigadeWorks } = useWorkerScope(user);
  const requests = useRepositorySnapshot(materialRequestsRepository);

  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("шт");
  const [workId, setWorkId] = useState<string>(defaultWorkId ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setMaterialName("");
    setQuantity("");
    setUnit("шт");
    setWorkId(defaultWorkId ?? "");
    setNote("");
  }

  async function handleSubmit() {
    const qty = Number(quantity);
    if (!employee || !materialName.trim() || !qty || qty <= 0 || submitting) return;
    setSubmitting(true);
    const nextNumber = requests.length > 0 ? Math.max(...requests.map((r) => r.number)) + 1 : 1;
    const today = new Date().toISOString().slice(0, 10);
    const relatedWork = brigadeWorks.find((w) => w.id === workId);
    const noteWithTask = relatedWork ? [`${s.problemModalTask}: ${relatedWork.title}`, note].filter(Boolean).join(" — ") : note;
    await materialRequestsRepository.create({
      id: `req-${Date.now()}`,
      number: nextNumber,
      documentNumber: `3-${new Date().getFullYear()}-${String(nextNumber).padStart(3, "0")}`,
      date: today,
      materialName: materialName.trim(),
      quantity: qty,
      unit,
      objectName: object?.name ?? "—",
      brigadeName: brigade?.name ?? "—",
      requestedBy: employee.fullName,
      status: "new",
      note: noteWithTask,
      createdDate: new Date().toISOString(),
      createdBy: employee.fullName,
    });
    setSubmitting(false);
    showToast(s.toastMaterialRequested, "success");
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={s.materialModalTitle}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {strings.common.cancelLabel}
          </Button>
          <Button onClick={handleSubmit} disabled={!materialName.trim() || !Number(quantity) || submitting}>
            {s.materialModalSubmit}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="worker-material-name" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.materialModalName}
          </label>
          <input
            id="worker-material-name"
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            autoFocus
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="worker-material-task" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.problemModalTask}
          </label>
          <select
            id="worker-material-task"
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          >
            <option value="">{s.problemModalNoTask}</option>
            {brigadeWorks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="worker-material-qty" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
              {s.materialModalQty}
            </label>
            <input
              id="worker-material-qty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="worker-material-unit" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
              {s.materialModalUnit}
            </label>
            <input
              id="worker-material-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
            />
          </div>
        </div>
        <div>
          <label htmlFor="worker-material-note" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.materialModalNote}
          </label>
          <textarea
            id="worker-material-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>
    </Modal>
  );
}
