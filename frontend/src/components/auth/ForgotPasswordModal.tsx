import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

/**
 * There's no backend here to actually send a reset email/SMS, so this never
 * claims to have sent one — it validates input, shows a real loading state,
 * then a neutral "here's what would happen" message that's explicit about
 * being a demo. It also never confirms or denies that the entered account
 * exists, matching authService's same non-enumeration guarantee.
 */
export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setValue("");
      setError("");
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [open]);

  function handleSubmit() {
    if (submitting) return;
    if (!value.trim()) {
      setError("Укажите логин, телефон или email");
      return;
    }
    setError("");
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 500);
  }

  return (
    <Modal open={open} onClose={onClose} title="Восстановление пароля" description="Демо-режим восстановления доступа" size="sm">
      {submitted ? (
        <div className="flex items-start gap-3 rounded-[10px] bg-[#F5F5F4] p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-ink-secondary" />
          <p className="text-sm text-ink-secondary">
            Если учётная запись с указанными данными существует, на неё будет отправлена инструкция по
            восстановлению доступа. В этой демо-версии реальная отправка не выполняется — интеграция с
            backend/почтовым сервисом появится позже.
          </p>
        </div>
      ) : (
        <>
          <label className="block text-sm font-medium text-ink" htmlFor="forgot-password-input">
            Логин, телефон или email
            <input
              id="forgot-password-input"
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder="Введите логин, телефон или email"
              className={inputClass}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "forgot-password-error" : undefined}
              autoFocus
            />
          </label>
          {error && (
            <p id="forgot-password-error" role="alert" className="mt-1.5 text-xs text-red">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
