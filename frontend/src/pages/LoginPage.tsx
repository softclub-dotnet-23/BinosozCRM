import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, LoaderCircle, Lock, QrCode, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { LoginVisualPanel } from "../components/auth/LoginVisualPanel";
import { LanguageSelector } from "../components/auth/LanguageSelector";
import { ForgotPasswordModal } from "../components/auth/ForgotPasswordModal";
import { QrLoginModal } from "../components/auth/QrLoginModal";
import { LOGIN_STRINGS, type LoginLanguage } from "../components/auth/loginTranslations";
import { usePersistentState } from "../hooks/usePersistentState";
import { cn } from "../utils/cn";
import "../styles/login.css";

interface FieldErrors {
  login?: string;
  password?: string;
}

export default function LoginPage() {
  const { login: signIn } = useAuth();
  const [language, setLanguage] = usePersistentState<LoginLanguage>("app.language", "ru");
  const strings = LOGIN_STRINGS[language];

  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedLogin = loginValue.trim();
    const errors: FieldErrors = {};
    if (!trimmedLogin) errors.login = strings.loginRequired;
    if (!password) errors.password = strings.passwordRequired;

    setFieldErrors(errors);
    setFormError("");

    if (errors.login) {
      loginRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    const result = await signIn(trimmedLogin, password, remember);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      setPassword("");
      passwordRef.current?.focus();
      return;
    }
    // On success, AuthContext's user updates and PublicOnlyRoute (wrapping /login) redirects automatically.
  }

  return (
    <div className="login-page">
      <LoginVisualPanel strings={strings} />

      <section className="login-form-panel">
        <LanguageSelector value={language} onChange={setLanguage} label="Язык интерфейса" />

        <div className="login-form-container">
          <div className="mobile-brand">
            <img src="/images/binosoz-mark.svg" alt="BINOSOZ" className="h-9 w-9" />
            <span>BINOSOZ</span>
          </div>

          <header className="form-heading">
            <h1>{strings.welcomeTitle}</h1>
            <p>{strings.welcomeSubtitle}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="login-input">{strings.loginLabel}</label>
              <div className={cn("input-shell", fieldErrors.login && "input-error")}>
                <User size={20} />
                <input
                  id="login-input"
                  ref={loginRef}
                  type="text"
                  autoComplete="username"
                  value={loginValue}
                  onChange={(e) => {
                    setLoginValue(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, login: undefined }));
                  }}
                  placeholder={strings.loginPlaceholder}
                  aria-invalid={Boolean(fieldErrors.login)}
                  aria-describedby={fieldErrors.login ? "login-error" : undefined}
                />
              </div>
              {fieldErrors.login && (
                <span id="login-error" role="alert" className="field-error">
                  {fieldErrors.login}
                </span>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="password-input">{strings.passwordLabel}</label>
              <div className={cn("input-shell", fieldErrors.password && "input-error")}>
                <Lock size={20} />
                <input
                  id="password-input"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder={strings.passwordPlaceholder}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? strings.hidePassword : strings.showPassword}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span id="password-error" role="alert" className="field-error">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            <div className="options-row">
              <label className="checkbox-label">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="checkbox-box">
                  <Check size={14} />
                </span>
                {strings.rememberMe}
              </label>
              <button type="button" className="link-button" onClick={() => setForgotOpen(true)}>
                {strings.forgotPassword}
              </button>
            </div>

            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting && <LoaderCircle className="submit-spinner" size={19} aria-hidden="true" />}
              <span>{submitting ? strings.submitting : strings.submit}</span>
              {!submitting && <ArrowRight size={20} />}
            </button>

            {formError && (
              <div role="alert" className="error-message">
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <div className="divider">
              <span />
              <b>{strings.or}</b>
              <span />
            </div>

            <button type="button" className="secondary-button" onClick={() => setQrOpen(true)}>
              <QrCode size={20} />
              <span>{strings.qrLogin}</span>
            </button>

            <div className="security-card">
              <ShieldCheck size={28} />
              <div>
                <strong>{strings.secureTitle}</strong>
                <p>{strings.secureDescription}</p>
              </div>
            </div>
          </form>
        </div>
      </section>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
      <QrLoginModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
