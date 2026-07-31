import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";

/**
 * Shown instead of an empty page when a mock/demo session (SessionUser.isBackendSession === false)
 * opens a page that only works against real backend data. A mock session carries no JWT, so any
 * protected GET here would either be skipped (silently blank) or 401 — neither tells the user what
 * to actually do, hence this explicit state with a way out.
 */
export function BackendSessionRequired({ roleHint = "Owner или Prorab" }: { roleHint?: string }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col items-start gap-3 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-warning">
        <ShieldAlert size={20} />
        <h2 className="text-base font-bold text-ink">Требуется вход через реальную backend-учётную запись</h2>
      </div>
      <p className="text-sm text-ink-secondary">
        Для этого раздела требуется вход через реальную backend-учётную запись {roleHint}. Текущая сессия —
        демонстрационная (mock) и не содержит токена backend, поэтому защищённые запросы к серверу не отправляются.
      </p>
      <Button
        onClick={() => {
          logout();
          navigate("/login", { replace: true });
        }}
      >
        Перейти ко входу
      </Button>
    </Card>
  );
}
