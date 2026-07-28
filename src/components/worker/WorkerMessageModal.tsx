import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { workerMessagesRepository } from "../../data/repositories";

interface WorkerMessageModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorkerMessageModal({ open, onClose }: WorkerMessageModalProps) {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();
  const { employee } = useWorkerScope(user);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!employee || !text.trim() || submitting) return;
    setSubmitting(true);
    await workerMessagesRepository.create({
      id: `msg-${Date.now()}`,
      fromEmployeeId: employee.id,
      fromEmployeeName: employee.fullName,
      toRole: "prorab",
      text: text.trim(),
      createdDate: new Date().toISOString(),
    });
    setSubmitting(false);
    showToast(s.toastMessageSent, "success");
    setText("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={s.messageModalTitle}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {strings.common.cancelLabel}
          </Button>
          <Button onClick={handleSubmit} disabled={!text.trim() || submitting}>
            {s.messageModalSubmit}
          </Button>
        </>
      }
    >
      <label htmlFor="worker-message-text" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
        {s.messageModalText}
      </label>
      <textarea
        id="worker-message-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={s.messageModalPlaceholder}
        rows={4}
        autoFocus
        className="w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink"
      />
    </Modal>
  );
}
