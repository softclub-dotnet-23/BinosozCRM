import { useEffect, useRef, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { readJson } from "../../lib/storage/localStorageEngine";
import { useLanguage } from "../../context/LanguageContext";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  note?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}

/** Real, persisted "Подтверждение удаления" setting (Settings → General) — off means destructive
 * actions proceed immediately instead of always stopping for a confirmation dialog. */
function confirmDeleteEnabled(): boolean {
  const settings = readJson<{ confirmDelete?: boolean }>("app.settings.v1");
  return settings?.confirmDelete ?? true;
}

export function ConfirmDialog({
  open,
  title,
  description,
  note,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  danger,
}: ConfirmDialogProps) {
  const { strings } = useLanguage();
  const resolvedConfirmLabel = confirmLabel ?? strings.common.confirmLabel;
  const resolvedCancelLabel = cancelLabel ?? strings.common.cancelLabel;
  const autoConfirmed = useRef(false);

  useEffect(() => {
    if (!open) {
      autoConfirmed.current = false;
      return;
    }
    if (!confirmDeleteEnabled() && !autoConfirmed.current) {
      autoConfirmed.current = true;
      onConfirm();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (open && !confirmDeleteEnabled()) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {resolvedCancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {resolvedConfirmLabel}
          </Button>
        </>
      }
    >
      {note && <div className="text-sm text-ink-secondary">{note}</div>}
    </Modal>
  );
}
