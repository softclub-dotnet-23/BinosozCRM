import { useEffect, useState } from "react";
import { AlertCircle, Loader2, User } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { ErrorState } from "../components/ui/ErrorState";
import { ApiError, NetworkError } from "../api/apiClient";
import { getMyWorkerProfile, type Worker } from "../api/workersApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.code === "WORKER_NOT_FOUND") return "Ваша учётная запись не привязана к рабочему. Обратитесь к администратору.";
    return error.message || fallback;
  }
  return fallback;
}

const PAY_RATE_LABEL: Record<NonNullable<Worker["payRateType"]>, string> = {
  Hourly: "Почасовая",
  Piecework: "Сдельная",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

/**
 * GET /workers/me (Application/Workers/GetOwnWorkerProfileQuery.cs,
 * Worker-role checkpoint) — a Worker's own record, always full detail
 * (own PayRate/Document*), unlike the masked view another role sees of
 * someone else's Worker row. Read-only for MVP — no edit/photo-upload/
 * document-upload endpoint exists yet, so this page doesn't offer them.
 */
export default function WorkerProfilePage() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoadState("loading");
    try {
      const profile = await getMyWorkerProfile();
      setWorker(profile);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.code === "WORKER_NOT_FOUND") {
        setLoadState("unavailable");
        return;
      }
      setLoadError(describeError(error, "Не удалось загрузить профиль"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppLayout title="Профиль" subtitle="Ваши личные и профессиональные данные">
      {loadState === "error" && (
        <Card style={{ padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void load()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "unavailable" && (
        <Card className="p-0">
          <ErrorState title="Учётная запись не привязана" description="Ваша учётная запись не привязана ни к одному рабочему. Обратитесь к администратору." />
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && worker && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-1">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
                <User size={32} />
              </div>
              <div>
                <p className="text-[17px] font-bold text-ink">{worker.fullName}</p>
                <p className="text-sm text-ink-secondary">{worker.specialty ?? "Специальность не указана"}</p>
              </div>
              <Badge tone={worker.isActive ? "green" : "red"}>{worker.isActive ? "Активен" : "Уволен"}</Badge>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h2 className="text-[15px] font-bold text-ink">Личные данные</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Телефон" value={worker.phone} />
              <Field label="Дата рождения" value={new Date(worker.birthDate).toLocaleDateString("ru-RU")} />
              <Field label="Дата приёма" value={new Date(worker.hireDate).toLocaleDateString("ru-RU")} />
              <Field label="Начало смены" value={worker.shiftStartTime ?? "—"} />
            </div>

            <h2 className="mt-6 text-[15px] font-bold text-ink">Профессиональные данные</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Тип ставки" value={worker.payRateType ? PAY_RATE_LABEL[worker.payRateType] : "—"} />
              <Field label="Ставка" value={worker.payRate !== null ? String(worker.payRate) : "—"} />
              <Field label="Документ" value={worker.documentType ?? "—"} />
              <Field label="Срок действия документа" value={worker.documentExpiryDate ? new Date(worker.documentExpiryDate).toLocaleDateString("ru-RU") : "—"} />
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
