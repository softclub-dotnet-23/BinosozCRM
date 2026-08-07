import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertCircle, Check, Loader2, QrCode, RotateCw, Smartphone, XCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { ApiError, NetworkError } from "../../api/apiClient";
import { devApproveQrLogin, exchangeQrLogin, getQrLoginStatus, startQrLogin, type QrLoginStart } from "../../api/qrAuthApi";

interface QrLoginModalProps {
  open: boolean;
  onClose: () => void;
}

type ModalState =
  | { phase: "starting" }
  | { phase: "ready"; session: QrLoginStart; scanned: boolean }
  | { phase: "exchanging"; session: QrLoginStart }
  | { phase: "approved" }
  | { phase: "expired" }
  | { phase: "rejected" }
  | { phase: "error"; message: string };

const POLL_INTERVAL_MS = 1500;

function describeError(error: unknown): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу. Проверьте соединение и попробуйте снова.";
  if (error instanceof ApiError) {
    if (error.code === "RATE_LIMITED") return "Слишком много попыток. Подождите немного и попробуйте снова.";
    return error.message || "Не удалось выполнить вход по QR-коду.";
  }
  return "Не удалось выполнить вход по QR-коду.";
}

export function QrLoginModal({ open, onClose }: QrLoginModalProps) {
  const { applyTokens } = useAuth();
  const [state, setState] = useState<ModalState>({ phase: "starting" });
  const [secondsLeft, setSecondsLeft] = useState(0);

  // DEV-only emulation form state — never rendered/used when import.meta.env.DEV is false.
  const [devPhone, setDevPhone] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devError, setDevError] = useState("");

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against a poll response landing after the modal already moved on
  // (closed, or a later poll already resolved it) — setState would otherwise
  // resurrect a stale phase.
  const cancelledRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    pollTimer.current = null;
    countdownTimer.current = null;
  }, []);

  const beginSession = useCallback(async () => {
    // Defensive: every existing call site already clears timers before a
    // state that offers a "retry" button, so this is never reachable with a
    // timer still running today — but making it unconditional means that
    // invariant holds by construction, not by every future edit remembering
    // to clear first.
    clearTimers();
    setState({ phase: "starting" });
    try {
      const session = await startQrLogin();
      if (cancelledRef.current) return;
      setState({ phase: "ready", session, scanned: false });

      const expiresAtMs = new Date(session.expiresAt).getTime();
      setSecondsLeft(Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)));
      countdownTimer.current = setInterval(() => {
        setSecondsLeft(Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)));
      }, 1000);

      pollTimer.current = setInterval(() => {
        void (async () => {
          try {
            const { status } = await getQrLoginStatus(session.sessionId);
            if (cancelledRef.current) return;

            if (status === "Scanned") {
              setState((prev) => (prev.phase === "ready" ? { phase: "ready", session, scanned: true } : prev));
              return;
            }
            if (status === "Expired") {
              clearTimers();
              setState({ phase: "expired" });
              return;
            }
            if (status === "Rejected") {
              clearTimers();
              setState({ phase: "rejected" });
              return;
            }
            if (status === "Approved") {
              clearTimers();
              setState({ phase: "exchanging", session });
              try {
                const tokens = await exchangeQrLogin(session.sessionId, session.qrToken);
                if (cancelledRef.current) return;
                await applyTokens(tokens, true);
                if (cancelledRef.current) return;
                setState({ phase: "approved" });
                onClose();
              } catch (exchangeError) {
                if (cancelledRef.current) return;
                setState({ phase: "error", message: describeError(exchangeError) });
              }
            }
          } catch (pollError) {
            if (cancelledRef.current) return;
            clearTimers();
            setState({ phase: "error", message: describeError(pollError) });
          }
        })();
      }, POLL_INTERVAL_MS);
    } catch (error) {
      if (cancelledRef.current) return;
      setState({ phase: "error", message: describeError(error) });
    }
  }, [applyTokens, clearTimers, onClose]);

  useEffect(() => {
    if (!open) return;
    cancelledRef.current = false;
    setDevPhone("");
    setDevPassword("");
    setDevError("");
    void beginSession();

    return () => {
      cancelledRef.current = true;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleDevApprove() {
    if (state.phase !== "ready" || devSubmitting) return;
    if (!devPhone.trim() || !devPassword.trim()) {
      setDevError("Укажите телефон и пароль тестового пользователя");
      return;
    }
    setDevSubmitting(true);
    setDevError("");
    try {
      await devApproveQrLogin(state.session.sessionId, state.session.qrToken, devPhone.trim(), devPassword);
      // The next poll tick picks up the Approved status and drives the exchange.
    } catch (error) {
      setDevError(describeError(error));
    } finally {
      setDevSubmitting(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <Modal open={open} onClose={onClose} title="Вход через QR-код" size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        {state.phase === "starting" && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <p className="text-sm text-ink-secondary">Создаём QR-код для входа…</p>
          </>
        )}

        {(state.phase === "ready" || state.phase === "exchanging") && (
          <>
            <div className="rounded-2xl border border-border bg-white p-4">
              <QRCodeSVG value={state.session.qrPayload} size={192} level="M" marginSize={2} />
            </div>

            {state.phase === "exchanging" ? (
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Loader2 size={16} className="animate-spin text-primary" />
                Выполняем вход…
              </div>
            ) : state.scanned ? (
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Smartphone size={16} className="text-primary" />
                Подтвердите вход на телефоне
              </div>
            ) : (
              <p className="text-sm text-ink-secondary">
                Отсканируйте QR-код в мобильном приложении BINOSOZ
                <br />
                Ожидание сканирования…
              </p>
            )}

            {state.phase === "ready" && (
              <p className="text-xs text-ink-muted">
                Код действителен ещё {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            )}

            {import.meta.env.DEV && state.phase === "ready" && (
              <div className="mt-1 w-full rounded-xl border border-dashed border-border-strong bg-[#FAFAF9] p-3 text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  DEV: эмулировать подтверждение с телефона
                </p>
                <div className="flex flex-col gap-2">
                  <input
                    type="tel"
                    placeholder="Телефон тестового пользователя"
                    value={devPhone}
                    onChange={(e) => setDevPhone(e.target.value)}
                    className="w-full rounded-lg border border-border-strong px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    className="w-full rounded-lg border border-border-strong px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  {devError && <p className="text-xs text-red">{devError}</p>}
                  <Button size="sm" variant="secondary" onClick={() => void handleDevApprove()} disabled={devSubmitting}>
                    {devSubmitting ? "Отправка…" : "Подтвердить (dev)"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {state.phase === "expired" && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F5F4] text-ink-muted">
              <QrCode size={28} />
            </div>
            <p className="text-sm text-ink-secondary">Время действия QR-кода истекло</p>
            <Button onClick={() => void beginSession()} className="w-full">
              <RotateCw size={16} />
              Обновить QR-код
            </Button>
          </>
        )}

        {state.phase === "rejected" && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-soft text-red">
              <XCircle size={28} />
            </div>
            <p className="text-sm text-ink-secondary">Вход отклонён на мобильном устройстве</p>
            <Button onClick={() => void beginSession()} className="w-full">
              <RotateCw size={16} />
              Обновить QR-код
            </Button>
          </>
        )}

        {state.phase === "approved" && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-soft text-green">
              <Check size={28} />
            </div>
            <p className="text-sm text-ink-secondary">Вход подтверждён</p>
          </>
        )}

        {state.phase === "error" && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-soft text-red">
              <AlertCircle size={28} />
            </div>
            <p className="text-sm text-ink-secondary">{state.message}</p>
            <Button onClick={() => void beginSession()} className="w-full">
              <RotateCw size={16} />
              Попробовать снова
            </Button>
          </>
        )}

        {state.phase !== "approved" && state.phase !== "exchanging" && (
          <Button variant="secondary" onClick={onClose} className="w-full">
            Закрыть
          </Button>
        )}
      </div>
    </Modal>
  );
}
