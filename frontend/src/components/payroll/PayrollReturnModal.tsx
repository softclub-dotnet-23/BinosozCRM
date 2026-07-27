import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import type { PayrollRecord } from "../../types";

interface PayrollReturnModalProps {
  open: boolean;
  record: PayrollRecord | null;
  onClose: () => void;
  onConfirm: (comment: string) => void;
}

export function PayrollReturnModal({ open, record, onClose, onConfirm }: PayrollReturnModalProps) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setComment("");
      setError("");
    }
  }, [open]);

  if (!record) return null;

  function handleConfirm() {
    if (!comment.trim()) {
      setError("Укажите причину возврата — это обязательное поле");
      return;
    }
    onConfirm(comment.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Вернуть на доработку"
      description={`${record.employeeName} · ${record.periodLabel}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Вернуть
          </Button>
        </>
      }
    >
      <label className="block text-sm font-medium text-ink" htmlFor="payroll-return-comment">
        Комментарий (обязательно)
      </label>
      <textarea
        id="payroll-return-comment"
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setError("");
        }}
        rows={4}
        placeholder="Например: пересчитать удержания по бригаде №3"
        className={cn(
          "mt-2 w-full rounded-[10px] border border-border-strong px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
          error && "border-red focus:border-red focus:ring-red/15",
        )}
      />
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
    </Modal>
  );
}
