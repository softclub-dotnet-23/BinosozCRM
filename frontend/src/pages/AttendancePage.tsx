import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CalendarCheck, Loader2, Plus } from "lucide-react";
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
import { approveTimesheet, createManualTimesheet, listTimesheets, type Timesheet } from "../api/timesheetsApi";
import { listObjects, type ConstructionObject } from "../api/objectsApi";
import { listBrigades } from "../api/brigadesApi";
import { listAllWorkers, type Worker } from "../api/workersApi";
import BrigadirAttendancePage from "./BrigadirAttendancePage";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const CREATE_FORM_INITIAL = { workerId: "", objectId: "", date: "", checkInAt: "", checkOutAt: "" };

export default function AttendancePage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirAttendancePage />;
  return <CompanyAttendancePage />;
}

function CompanyAttendancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canApprove = user?.role === "prorab";

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [timesheetsResult, brigadesResult, objectsResult] = await Promise.all([
        listTimesheets(1, 100),
        listBrigades(1, 100),
        listObjects(1, 100),
      ]);
      setTimesheets(timesheetsResult.items);
      setObjects(objectsResult.items);
      setWorkers(await listAllWorkers(brigadesResult.items.map((b) => b.id)));
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить табели"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const workerNameById = useMemo(() => new Map(workers.map((w) => [w.id, w.fullName])), [workers]);
  const objectNameById = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);

  const kpis = useMemo(() => ({
    total: timesheets.length,
    pendingApproval: timesheets.filter((t) => !t.approvedAt).length,
    late: timesheets.filter((t) => (t.lateMinutes ?? 0) > 0).length,
  }), [timesheets]);

  function openCreate() {
    setCreateForm({ ...CREATE_FORM_INITIAL, workerId: workers[0]?.id ?? "", objectId: objects[0]?.id ?? "" });
    setCreateError("");
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    const { workerId, objectId, date, checkInAt } = createForm;
    if (!workerId || !objectId || !date || !checkInAt) {
      setCreateError("Заполните работника, объект, дату и время прихода");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createManualTimesheet({
        workerId,
        objectId,
        date,
        checkInAt: new Date(checkInAt).toISOString(),
        checkOutAt: createForm.checkOutAt ? new Date(createForm.checkOutAt).toISOString() : undefined,
      });
      setTimesheets((current) => [created, ...current]);
      setCreateOpen(false);
      showToast("Табель добавлен");
    } catch (error) {
      setCreateError(describeError(error, "Не удалось добавить табель"));
    } finally {
      setCreating(false);
    }
  }

  async function handleApprove(timesheet: Timesheet) {
    if (busyId) return;
    setBusyId(timesheet.id);
    try {
      const updated = await approveTimesheet(timesheet.id);
      setTimesheets((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Табель утверждён");
    } catch (error) {
      showToast(describeError(error, "Не удалось утвердить табель"), "error");
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<Timesheet>[] = [
    { key: "worker", header: "Работник", render: (row) => <span className="font-semibold text-ink">{workerNameById.get(row.workerId) ?? "—"}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectNameById.get(row.objectId) ?? "—"}</span> },
    { key: "date", header: "Дата", render: (row) => <span className="text-ink-secondary">{row.date}</span> },
    { key: "checkIn", header: "Приход", render: (row) => <span className="text-ink-secondary">{row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "—"}</span> },
    { key: "checkOut", header: "Уход", render: (row) => <span className="text-ink-secondary">{row.checkOutAt ? new Date(row.checkOutAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "—"}</span> },
    { key: "late", header: "Опоздание", render: (row) => (row.lateMinutes ? <Badge tone="red">{row.lateMinutes} мин</Badge> : <span className="text-ink-muted">—</span>) },
    { key: "hours", header: "Часов", render: (row) => <span className="text-ink-secondary">{row.hoursWorked ?? "—"}</span> },
    { key: "approved", header: "Статус", render: (row) => <Badge tone={row.approvedAt ? "green" : "orange"}>{row.approvedAt ? "Утверждён" : "Ожидает"}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) =>
        canApprove && !row.approvedAt ? (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" disabled={busyId === row.id} onClick={() => void handleApprove(row)}>Утвердить</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <AppLayout
      title="Явка"
      subtitle="Табели учёта рабочего времени"
      action={<Button onClick={openCreate} disabled={workers.length === 0 || objects.length === 0}><Plus size={15} /> Добавить табель</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего записей" value={String(kpis.total)} icon={CalendarCheck} tone="orange" footer="За всё время" />
        <MetricCard label="Ожидают утверждения" value={String(kpis.pendingApproval)} icon={CalendarCheck} tone="blue" footer="Требуют решения прораба" />
        <MetricCard label="С опозданием" value={String(kpis.late)} icon={CalendarCheck} tone="red" footer="Записей с опозданием" />
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
            <h2 className="text-[17px] font-bold text-ink">Табели</h2>
          </div>
          <div className="mt-4">
            {timesheets.length > 0 ? (
              <DataTable columns={columns} rows={timesheets} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={CalendarCheck} title="Табели не найдены" description="Добавьте первую запись явки" />
            )}
          </div>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Добавить табель" description="Ручная запись (например, задним числом)" size="md">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label><span>Работник</span><CustomSelect fullWidth value={createForm.workerId} onValueChange={(v) => setCreateForm((f) => ({ ...f, workerId: v }))} options={workers.map((w) => ({ value: w.id, label: w.fullName }))} /></label>
          <label><span>Объект</span><CustomSelect fullWidth value={createForm.objectId} onValueChange={(v) => setCreateForm((f) => ({ ...f, objectId: v }))} options={objects.map((o) => ({ value: o.id, label: o.name }))} /></label>
          <label><span>Дата</span><input type="date" value={createForm.date} onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))} /></label>
          <label><span>Время прихода</span><input type="datetime-local" value={createForm.checkInAt} onChange={(e) => setCreateForm((f) => ({ ...f, checkInAt: e.target.value }))} /></label>
          <label><span>Время ухода</span><input type="datetime-local" value={createForm.checkOutAt} onChange={(e) => setCreateForm((f) => ({ ...f, checkOutAt: e.target.value }))} /></label>
          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creating}>{creating ? "Сохранение..." : "Добавить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
