import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, Plus, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import { listBrigades, type Brigade } from "../api/brigadesApi";
import { createWorker, listAllWorkers, type PayRateType, type Worker } from "../api/workersApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const ADD_FORM_INITIAL = { fullName: "", phone: "", birthDate: "", payRateType: "Hourly" as PayRateType, payRate: "", hireDate: "", specialty: "" };

/**
 * "Transfer between brigades" has no backend counterpart — Domain.Worker has
 * no method to change BrigadeId (only Create/Terminate/ChangePayRate), so
 * that action is left out here rather than faked.
 */
export default function BrigadeCompositionPage() {
  const { showToast } = useToast();

  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [addTarget, setAddTarget] = useState<Brigade | null>(null);
  const [addForm, setAddForm] = useState(ADD_FORM_INITIAL);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const brigadesResult = await listBrigades(1, 100);
      setBrigades(brigadesResult.items);
      const allWorkers = await listAllWorkers(brigadesResult.items.map((b) => b.id));
      setWorkers(allWorkers);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить состав бригад"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const workersByBrigade = useMemo(() => {
    const map = new Map<string, Worker[]>();
    for (const worker of workers) {
      if (!worker.isActive) continue;
      const list = map.get(worker.brigadeId) ?? [];
      list.push(worker);
      map.set(worker.brigadeId, list);
    }
    return map;
  }, [workers]);

  const kpis = useMemo(() => ({
    brigades: brigades.length,
    workers: workers.filter((w) => w.isActive).length,
    unstaffed: brigades.filter((b) => (workersByBrigade.get(b.id)?.length ?? 0) === 0).length,
  }), [brigades, workers, workersByBrigade]);

  function openAdd(brigade: Brigade) {
    setAddTarget(brigade);
    setAddForm(ADD_FORM_INITIAL);
    setAddError("");
  }

  async function submitAdd(event: FormEvent) {
    event.preventDefault();
    if (!addTarget || adding) return;
    const { fullName, phone, birthDate, hireDate, payRate } = addForm;
    if (!fullName.trim() || !phone.trim() || !birthDate || !hireDate) {
      setAddError("Заполните ФИО, телефон, дату рождения и дату найма");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const created = await createWorker(addTarget.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        birthDate,
        payRateType: addForm.payRateType,
        payRate: Number(payRate) || 0,
        hireDate,
        specialty: addForm.specialty.trim() || undefined,
      });
      setWorkers((current) => [created, ...current]);
      setAddTarget(null);
      showToast("Сотрудник добавлен в бригаду");
    } catch (error) {
      setAddError(describeError(error, "Не удалось добавить сотрудника"));
    } finally {
      setAdding(false);
    }
  }

  return (
    <AppLayout title="Состав бригад" subtitle="Работники в разрезе бригад">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Бригад" value={String(kpis.brigades)} icon={UsersRound} tone="orange" footer="Всего в компании" />
        <MetricCard label="Работников" value={String(kpis.workers)} icon={UsersRound} tone="green" footer="Активных во всех бригадах" />
        <MetricCard label="Без состава" value={String(kpis.unstaffed)} icon={AlertCircle} tone="red" footer="Бригады без работников" />
      </div>

      {loadState === "error" && (
        <Card style={{ marginTop: 16, padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void loadAll()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ marginTop: 16, padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && (
        brigades.length === 0 ? (
          <Card className="mt-4"><EmptyState icon={UsersRound} title="Бригады не найдены" description="Сначала создайте бригаду на странице «Бригады»" /></Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {brigades.map((brigade) => {
              const members = workersByBrigade.get(brigade.id) ?? [];
              return (
                <Card key={brigade.id} className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-bold text-ink">{brigade.name}</h3>
                      <span className="text-xs text-ink-muted">{members.length} {members.length === 1 ? "работник" : "работников"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={brigade.isActive ? "green" : "red"}>{brigade.isActive ? "Активна" : "Неактивна"}</Badge>
                      <Button size="sm" variant="secondary" onClick={() => openAdd(brigade)}><Plus size={13} /> Добавить</Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    {members.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {members.map((worker) => (
                          <li key={worker.id} className="flex items-center justify-between rounded-lg bg-[#F5F5F4] px-3 py-2 text-sm">
                            <span className="font-medium text-ink">{worker.fullName}</span>
                            <span className="text-ink-muted">{worker.specialty ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-ink-muted">Нет работников в этой бригаде</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      <Modal open={addTarget !== null} onClose={() => setAddTarget(null)} title="Добавить в бригаду" description={addTarget?.name} size="md">
        <form className="users-modal-form" onSubmit={submitAdd}>
          <label><span>ФИО</span><input value={addForm.fullName} onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))} autoFocus /></label>
          <label><span>Телефон</span><input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+992 00 000 00 00" /></label>
          <label><span>Дата рождения</span><input type="date" value={addForm.birthDate} onChange={(e) => setAddForm((f) => ({ ...f, birthDate: e.target.value }))} /></label>
          <label><span>Дата найма</span><input type="date" value={addForm.hireDate} onChange={(e) => setAddForm((f) => ({ ...f, hireDate: e.target.value }))} /></label>
          <label><span>Тип оплаты</span><CustomSelect fullWidth value={addForm.payRateType} onValueChange={(v) => setAddForm((f) => ({ ...f, payRateType: v as PayRateType }))} options={[{ value: "Hourly", label: "Почасовая" }, { value: "Piecework", label: "Сдельная" }]} /></label>
          <label><span>Ставка</span><input type="number" min="0" step="0.01" value={addForm.payRate} onChange={(e) => setAddForm((f) => ({ ...f, payRate: e.target.value }))} /></label>
          <label><span>Специальность</span><input value={addForm.specialty} onChange={(e) => setAddForm((f) => ({ ...f, specialty: e.target.value }))} /></label>
          {addError && <p className="users-modal-error" role="alert">{addError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAddTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={adding}>{adding ? "Добавление..." : "Добавить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
