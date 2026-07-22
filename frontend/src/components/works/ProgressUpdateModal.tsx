import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { progressTone } from "../../utils/workStatus";
import type { Work } from "../../types";

interface ProgressUpdateModalProps {
  open: boolean;
  onClose: () => void;
  work: Work | null;
  onSave: (workId: string, progress: number, note: string) => void;
}

export function ProgressUpdateModal({ open, onClose, work, onSave }: ProgressUpdateModalProps) {
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (work) setProgress(work.progress);
    setNote("");
  }, [work, open]);

  if (!work) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Изменить прогресс"
      description={`${work.code} — ${work.title}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              onSave(work.id, progress, note.trim());
              onClose();
            }}
          >
            Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-secondary">Прогресс</span>
            <span className="font-semibold text-ink tabular">{progress}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
            aria-label="Прогресс, %"
          />
          <ProgressBar value={progress} tone={progressTone(work.status, progress)} className="mt-2" />
        </div>
        <label className="block text-sm font-medium text-ink">
          Комментарий к обновлению
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Например, залито 40 м³ бетона"
            className="mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </label>
      </div>
    </Modal>
  );
}
