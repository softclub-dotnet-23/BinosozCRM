import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { problemReportsRepository } from "../../data/repositories";
import type { ProblemReportPriority } from "../../types";

interface WorkerProblemModalProps {
  open: boolean;
  onClose: () => void;
  defaultWorkId?: string | null;
}

/** Self-contained: resolves the current worker's own identity via useWorkerScope, so it can be
 * mounted from the Sidebar's "Сообщить о проблеме" button and from the Dashboard's quick actions
 * without either caller having to plumb employee/brigade data down to it. */
export function WorkerProblemModal({ open, onClose, defaultWorkId = null }: WorkerProblemModalProps) {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee, brigadeWorks } = useWorkerScope(user);

  const [category, setCategory] = useState(s.problemCategorySafety);
  const [workId, setWorkId] = useState<string>(defaultWorkId ?? "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ProblemReportPriority>("medium");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCategory(s.problemCategorySafety);
    setWorkId(defaultWorkId ?? "");
    setDescription("");
    setPriority("medium");
  }

  async function handleSubmit() {
    if (!employee || !description.trim() || submitting) return;
    setSubmitting(true);
    const relatedWork = brigadeWorks.find((w) => w.id === workId) ?? null;
    await problemReportsRepository.create({
      id: `problem-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.fullName,
      category,
      relatedWorkId: relatedWork?.id ?? null,
      relatedWorkTitle: relatedWork?.title ?? null,
      description: description.trim(),
      priority,
      status: "new",
      createdDate: new Date().toISOString(),
    });
    setSubmitting(false);
    showToast(s.toastProblemReported, "success");
    reset();
    onClose();
  }

  const categories = [s.problemCategorySafety, s.problemCategoryMaterials, s.problemCategoryEquipment, s.problemCategoryOther];

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={s.problemModalTitle}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {strings.common.cancelLabel}
          </Button>
          <Button onClick={handleSubmit} disabled={!description.trim() || submitting}>
            {s.problemModalSubmit}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="problem-category" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.problemModalCategory}
          </label>
          <select
            id="problem-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="problem-task" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.problemModalTask}
          </label>
          <select
            id="problem-task"
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

        <div>
          <label htmlFor="problem-description" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.problemModalDescription}
          </label>
          <textarea
            id="problem-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">{s.problemModalPriority}</span>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as ProblemReportPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={
                  priority === p
                    ? "flex-1 rounded-lg border border-primary bg-primary-soft py-2 text-xs font-semibold text-primary"
                    : "flex-1 rounded-lg border border-border-strong py-2 text-xs font-medium text-ink-secondary hover:bg-surface-2"
                }
              >
                {p === "low" ? s.priorityLow : p === "medium" ? s.priorityMedium : s.priorityHigh}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
