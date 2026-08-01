import { useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { ApiError, NetworkError } from "../../api/apiClient";
import { changePassword } from "../../api/authApi";
import { markForcePasswordChange } from "../../lib/auth/session";

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

function mapChangePasswordError(error: unknown): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.code === "AUTH_INVALID_CREDENTIALS") return "Текущий пароль указан неверно";
    return error.message || "Не удалось сменить пароль";
  }
  return "Не удалось сменить пароль";
}

/**
 * Blocking gate mirroring ForcePasswordChangeMiddleware's own allow-list on
 * the backend: while forcePasswordChange is set, every request except
 * change-password/logout is rejected there too, so this modal offers exactly
 * those two ways out — never a dismiss into a half-authenticated state.
 */
export function ForcePasswordChangeModal() {
  const { user, forcePasswordChange, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (newPassword.length < 8) {
      setError("Новый пароль должен содержать не менее 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      markForcePasswordChange(false);
    } catch (err) {
      setError(mapChangePasswordError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={Boolean(user) && forcePasswordChange}
      onClose={() => void logout()}
      title="Требуется смена пароля"
      description="Перед продолжением работы задайте новый пароль"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-ink">
          Текущий пароль
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Новый пароль
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Повторите новый пароль
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            required
          />
        </label>

        {error && (
          <div role="alert" className="flex items-center gap-2 text-sm text-red">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => void logout()}>
            Выйти
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Сохранение..." : "Сменить пароль"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
