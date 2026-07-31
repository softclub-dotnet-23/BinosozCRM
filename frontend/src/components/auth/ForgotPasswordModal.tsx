import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { forgotPassword } from "../../api/authApi";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

/**
 * Calls the real POST /auth/forgot-password, which always returns success
 * regardless of whether the phone exists (backend's own non-enumeration
 * guarantee — MASTER §9.4/§11.2) — so the neutral "if an account exists..."
 * message here isn't a demo placeholder, it's the accurate description of
 * what the backend actually does. The reset token itself is delivered via
 * Telegram, not this UI.
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

  async function handleSubmit() {
    if (submitting) return;
    if (!value.trim()) {
      setError("Укажите номер телефона");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(value.trim());
      setSubmitted(true);
    } catch {
      setError("Не удалось отправить запрос. Проверьте соединение и попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Восстановление пароля" description="Укажите телефон, привязанный к учётной записи" size="sm">
      {submitted ? (
        <div className="flex items-start gap-3 rounded-[10px] bg-[#F5F5F4] p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-ink-secondary" />
          <p className="text-sm text-ink-secondary">
            Если учётная запись с указанным телефоном существует, инструкция по восстановлению доступа будет
            отправлена через Telegram-бот, привязанный к аккаунту.
          </p>
        </div>
      ) : (
        <>
          <label className="block text-sm font-medium text-ink" htmlFor="forgot-password-input">
            Номер телефона
            <input
              id="forgot-password-input"
              type="tel"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder="Введите номер телефона"
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
