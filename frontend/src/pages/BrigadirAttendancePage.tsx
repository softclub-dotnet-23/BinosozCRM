import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CalendarCheck, Loader2, LogIn, LogOut } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import { checkIn, checkOut, listTimesheets, type Timesheet } from "../api/timesheetsApi";
import { listObjectLookups, listWorkerLookups, toNameMap, type LookupItem } from "../api/lookupsApi";
import { formatDushanbeTime } from "../utils/dushanbeTime";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.status === 403) return "У вас нет прав для этого действия.";
    if (error.code === "TIMESHEET_ABSENCE_CONFLICT") return "У этого сотрудника оформлено отсутствие на эту дату.";
    if (error.code === "TIMESHEET_ALREADY_CHECKED_IN") return "Этот сотрудник уже отмечен сегодня.";
    return error.message || fallback;
  }
  return fallback;
}

/**
 * GET /timesheets, POST /timesheets/check-in and /{id}/check-out are all
 * real, Brigadir-scoped-to-own-brigade endpoints. The only reason this page
 * was previously a placeholder is that there was no way for a Brigadir to
 * resolve worker/object names for their own crew — /lookups/workers and
 * /lookups/objects (both scoped to the caller's own brigade) close that gap.
 */
export default function BrigadirAttendancePage() {
  const { showToast } = useToast();

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [workers, setWorkers] = useState<LookupItem[]>([]);
  const [objects, setObjects] = useState<LookupItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInWorkerId, setCheckInWorkerId] = useState("");
  const [checkInObjectId, setCheckInObjectId] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [timesheetsResult, workersResult, objectsResult] = await Promise.all([
        listTimesheets(1, 100),
        listWorkerLookups({ limit: 100 }),
        listObjectLookups({ limit: 100 }),
      ]);
      setTimesheets(timesheetsResult.items);
      setWorkers(workersResult);
      setObjects(objectsResult);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.code === "WORKER_NOT_FOUND") {
        setLoadState("unavailable");
        return;
      }
      setLoadError(describeError(error, "Не удалось загрузить посещаемость"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const workerNameById = useMemo(() => toNameMap(workers), [workers]);
  const objectNameById = useMemo(() => toNameMap(objects), [objects]);

  const kpis = useMemo(() => ({
    total: timesheets.length,
    open: timesheets.filter((t) => t.checkInAt && !t.checkOutAt).length,
    pendingApproval: timesheets.filter((t) => !t.approvedAt).length,
  }), [timesheets]);

  function openCheckIn() {
    setCheckInWorkerId(workers[0]?.id ?? "");
    setCheckInObjectId(objects[0]?.id ?? "");
    setCheckInError("");
    setCheckInOpen(true);
  }

  async function submitCheckIn(event: FormEvent) {
    event.preventDefault();
    if (checkingIn) return;
    if (!checkInWorkerId || !checkInObjectId) {
      setCheckInError("Выберите сотрудника и объект");
      return;
    }
    setCheckingIn(true);
    setCheckInError("");
    try {
      const created = await checkIn(checkInWorkerId, checkInObjectId);
      setTimesheets((current) => [created, ...current.filter((t) => t.id !== created.id)]);
      setCheckInOpen(false);
      showToast("Приход отмечен");
    } catch (error) {
      setCheckInError(describeError(error, "Не удалось отметить приход"));
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut(timesheet: Timesheet) {
    if (busyId) return;
    setBusyId(timesheet.id);
    try {
      const updated = await checkOut(timesheet.id);
      setTimesheets((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Уход отмечен");
    } catch (error) {
      showToast(describeError(error, "Не удалось отметить уход"), "error");
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<Timesheet>[] = [
    { key: "worker", header: "Сотрудник", render: (row) => <span className="font-semibold text-ink">{workerNameById.get(row.workerId) ?? "—"}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectNameById.get(row.objectId) ?? "—"}</span> },
    { key: "date", header: "Дата", render: (row) => <span className="text-ink-secondary">{row.date}</span> },
    { key: "checkIn", header: "Приход", render: (row) => <span className="text-ink-secondary">{row.checkInAt ? formatDushanbeTime(row.checkInAt) : "—"}</span> },
    { key: "checkOut", header: "Уход", render: (row) => <span className="text-ink-secondary">{row.checkOutAt ? formatDushanbeTime(row.checkOutAt) : "—"}</span> },
    { key: "late", header: "Опоздание", render: (row) => (row.lateMinutes ? <Badge tone="orange">{row.lateMinutes} мин</Badge> : <span className="text-ink-muted">—</span>) },
    { key: "approved", header: "Статус", render: (row) => <Badge tone={row.approvedAt ? "green" : "orange"}>{row.approvedAt ? "Утверждён" : "Ожидает"}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) =>
        row.checkInAt && !row.checkOutAt ? (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="secondary" disabled={busyId === row.id} onClick={() => void handleCheckOut(row)}>
              <LogOut size={13} /> Отметить уход
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <AppLayout
      title="Посещаемость"
      subtitle="Отметки прихода и ухода вашей бригады"
      action={<Button onClick={openCheckIn} disabled={workers.length === 0 || objects.length === 0}><LogIn size={15} /> Отметить приход</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего отметок" value={String(kpis.total)} icon={CalendarCheck} tone="orange" footer="За всё время" />
        <MetricCard label="Открытых смен" value={String(kpis.open)} icon={CalendarCheck} tone="blue" footer="Отмечен приход, нет ухода" />
        <MetricCard label="Ожидают утверждения" value={String(kpis.pendingApproval)} icon={CalendarCheck} tone="green" footer="Прораб ещё не утвердил" />
      </div>

      {loadState === "error" && (
        <Card style={{ marginTop: 16, padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void loadAll()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "unavailable" && (
        <Card className="mt-4 p-0">
          <ErrorState
            title="Бригада не найдена"
            description="Ваша учётная запись не привязана ни к одной бригаде. Обратитесь к администратору."
          />
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ marginTop: 16, padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && (
        <Card className="mt-4">
          <div className="mt-4">
            {timesheets.length > 0 ? (
              <DataTable columns={columns} rows={timesheets} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={CalendarCheck} title="Отметок пока нет" description="Отметьте приход первого сотрудника" />
            )}
          </div>
        </Card>
      )}

      <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Отметить приход" size="sm">
        <form className="users-modal-form" onSubmit={submitCheckIn}>
          <label><span>Сотрудник</span><CustomSelect fullWidth value={checkInWorkerId} onValueChange={setCheckInWorkerId} options={workers.map((w) => ({ value: w.id, label: w.name }))} /></label>
          <label><span>Объект</span><CustomSelect fullWidth value={checkInObjectId} onValueChange={setCheckInObjectId} options={objects.map((o) => ({ value: o.id, label: o.name }))} /></label>
          {checkInError && <p className="users-modal-error" role="alert">{checkInError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCheckInOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={checkingIn}>{checkingIn ? "Сохранение..." : "Отметить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
