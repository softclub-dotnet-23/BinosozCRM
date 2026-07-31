import { useState, type FormEvent } from "react";
import { AlertCircle, KeyRound, LoaderCircle, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../lib/auth/authService";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import "../styles/login.css";

/**
 * Gated in exclusively via RouteGuards.tsx whenever forcePasswordChange is true — mirrors the
 * backend's own ForcePasswordChangeMiddleware, which 403s (PASSWORD_CHANGE_REQUIRED) every
 * request except /auth/change-password and /auth/logout until this happens. No route out except
 * completing this form or logging out.
 */
export default function ChangePasswordRequiredPage() {
  const { completePasswordChange, logout } = useAuth();
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

    setSubmitting(true);
    setError("");
    const result = await changePassword(currentPassword, newPassword);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    completePasswordChange();
  }

  return (
    <div className="login-page">
      <section
        className="login-form-panel"
        style={{ left: "50%", right: "auto", transform: "translateX(-50%)", width: "min(480px, 92vw)" }}
      >
        <div className="login-form-container">
          <header className="form-heading">
            <h1>Смена пароля обязательна</h1>
            <p>Перед продолжением работы установите новый пароль для вашей учётной записи.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="current-password">Текущий пароль</label>
              <div className="input-shell">
                <Lock size={20} />
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="new-password">Новый пароль</label>
              <div className="input-shell">
                <KeyRound size={20} />
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="confirm-password">Повторите новый пароль</label>
              <div className="input-shell">
                <KeyRound size={20} />
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <LoaderCircle className="submit-spinner" size={19} aria-hidden="true" />}
              {submitting ? "Сохранение..." : "Сохранить новый пароль"}
            </Button>

            {error && (
              <div role="alert" className="error-message">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </form>

          <Card className="mt-4 p-4">
            <button type="button" onClick={logout} className="text-sm font-semibold text-primary hover:text-primary-hover">
              Выйти из системы
            </button>
          </Card>
        </div>
      </section>
    </div>
  );
}
