import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, Plus, ShieldCheck, Users, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { ApiError, NetworkError } from "../api/apiClient";
import { activateBrigade, assignBrigadir, createBrigade, deactivateBrigade, listBrigades, type Brigade } from "../api/brigadesApi";
import { listUsers, type AppUser } from "../api/usersApi";
import BrigadirTeamPage from "./BrigadirTeamPage";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

export default function BrigadesPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirTeamPage />;
  return <CompanyBrigadesPage />;
}

function CompanyBrigadesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwner = user?.role === "owner";

  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [brigadirUsers, setBrigadirUsers] = useState<AppUser[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [assignTarget, setAssignTarget] = useState<Brigade | null>(null);
  const [assignValue, setAssignValue] = useState<string>("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const requests: [ReturnType<typeof listBrigades>, Promise<AppUser[]>] = [
        listBrigades(1, 100),
        // /users is Owner-only — a Prorab has no way to resolve brigadirUserId
        // to a name through any endpoint today, so we simply don't ask.
        isOwner ? listUsers(1, 100).then((r) => r.items) : Promise.resolve([]),
      ];
      const [brigadesResult, usersResult] = await Promise.all(requests);
      setBrigades(brigadesResult.items);
      setBrigadirUsers(usersResult.filter((u) => u.role === "brigadir"));
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить бригады"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brigadirNameById = useMemo(() => new Map(brigadirUsers.map((u) => [u.id, u.fullName])), [brigadirUsers]);

  const kpis = useMemo(() => ({
    total: brigades.length,
    active: brigades.filter((b) => b.isActive).length,
    inactive: brigades.filter((b) => !b.isActive).length,
  }), [brigades]);

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    if (!createName.trim()) {
      setCreateError("Укажите название бригады");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createBrigade(createName.trim());
      setBrigades((current) => [created, ...current]);
      setCreateOpen(false);
      setCreateName("");
      showToast("Бригада создана");
    } catch (error) {
      setCreateError(describeError(error, "Не удалось создать бригаду"));
    } finally {
      setCreating(false);
    }
  }

  function openAssign(brigade: Brigade) {
    setAssignTarget(brigade);
    setAssignValue(brigade.brigadirUserId ?? "");
    setAssignError("");
  }

  async function submitAssign(event: FormEvent) {
    event.preventDefault();
    if (!assignTarget || assigning) return;
    setAssigning(true);
    setAssignError("");
    try {
      const updated = await assignBrigadir(assignTarget.id, assignValue || null);
      setBrigades((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      setAssignTarget(null);
      showToast("Бригадир обновлён");
    } catch (error) {
      setAssignError(describeError(error, "Не удалось назначить бригадира"));
    } finally {
      setAssigning(false);
    }
  }

  async function toggleActive(brigade: Brigade) {
    if (busyId) return;
    setBusyId(brigade.id);
    try {
      const updated = brigade.isActive ? await deactivateBrigade(brigade.id) : await activateBrigade(brigade.id);
      setBrigades((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      showToast(updated.isActive ? "Бригада активирована" : "Бригада деактивирована");
    } catch (error) {
      showToast(describeError(error, "Не удалось изменить статус"), "error");
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<Brigade>[] = [
    { key: "name", header: "Бригада", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    {
      key: "brigadir",
      header: "Бригадир",
      render: (row) =>
        row.brigadirUserId ? (
          <span className="text-ink-secondary">{isOwner ? (brigadirNameById.get(row.brigadirUserId) ?? "Назначен") : "Назначен"}</span>
        ) : (
          <span className="text-ink-muted">Не назначен</span>
        ),
    },
    { key: "status", header: "Статус", render: (row) => <Badge tone={row.isActive ? "green" : "red"}>{row.isActive ? "Активна" : "Неактивна"}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {isOwner && (
            <Button size="sm" variant="secondary" onClick={() => openAssign(row)}>
              <ShieldCheck size={13} /> Бригадир
            </Button>
          )}
          <Button size="sm" variant={row.isActive ? "secondary" : "primary"} disabled={busyId === row.id} onClick={() => void toggleActive(row)}>
            {row.isActive ? "Деактивировать" : "Активировать"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Бригады"
      subtitle="Управление бригадами"
      action={<Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Создать бригаду</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего бригад" value={String(kpis.total)} icon={Users} tone="orange" footer="Все бригады компании" />
        <MetricCard label="Активные" value={String(kpis.active)} icon={UsersRound} tone="green" footer="В работе" />
        <MetricCard label="Неактивные" value={String(kpis.inactive)} icon={UsersRound} tone="red" footer="Приостановлены" />
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
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Список бригад</h2>
          </div>
          <div className="mt-4">
            {brigades.length > 0 ? (
              <DataTable columns={columns} rows={brigades} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={Users} title="Бригады не найдены" description="Создайте первую бригаду" />
            )}
          </div>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Создать бригаду" size="sm">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label><span>Название</span><input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Бригада №1" autoFocus /></label>
          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creating}>{creating ? "Создание..." : "Создать"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={assignTarget !== null} onClose={() => setAssignTarget(null)} title="Назначить бригадира" description={assignTarget?.name} size="sm">
        <form className="users-modal-form" onSubmit={submitAssign}>
          <label>
            <span>Бригадир</span>
            <CustomSelect
              fullWidth
              value={assignValue}
              onValueChange={setAssignValue}
              options={[{ value: "", label: "Не назначен" }, ...brigadirUsers.map((u) => ({ value: u.id, label: u.fullName }))]}
            />
          </label>
          {brigadirUsers.length === 0 && <p className="text-xs text-ink-muted">Нет пользователей с ролью «Бригадир» — создайте их на странице «Пользователи».</p>}
          {assignError && <p className="users-modal-error" role="alert">{assignError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setAssignTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={assigning}>{assigning ? "Сохранение..." : "Сохранить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
