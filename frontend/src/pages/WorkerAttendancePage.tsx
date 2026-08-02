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
import { getMyWorkerProfile } from "../api/workersApi";
import { listObjectLookups, toNameMap, type LookupItem } from "../api/lookupsApi";
import { formatDushanbeTime } from "../utils/dushanbeTime";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.code === "TIMESHEET_ABSENCE_CONFLICT") return "На эту дату у вас оформлено отсутствие.";
    if (error.code === "TIMESHEET_ALREADY_CHECKED_IN") return "Вы уже отмечены сегодня.";
    if (error.code === "WORKER_NOT_FOUND") return "Ваша учётная запись не привязана к рабочему. Обратитесь к администратору.";
    return error.message || fallback;
  }
  return fallback;
}

/**
 * POST /timesheets/check-in,/check-out are Worker-scoped to self only
 * (Application/Timesheets/CheckInCommand.cs, Worker-role checkpoint) —
 * unlike Brigadir, who can check in any worker on their crew, a Worker can
 * only ever act on their own attendance. No worker picker in the check-in
 * form for that reason — the object is the only real choice.
 */
export default function WorkerAttendancePage() {
  const { showToast } = useToast();

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [ownWorkerId, setOwnWorkerId] = useState<string | null>(null);
  const [objects, setObjects] = useState<LookupItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInObjectId, setCheckInObjectId] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [profile, timesheetsResult, objectsResult] = await Promise.all([
        getMyWorkerProfile(),
        listTimesheets(1, 100),
        listObjectLookups({ limit: 100 }),
      ]);
      setOwnWorkerId(profile.id);
      setTimesheets(timesheetsResult.items);
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

  const objectNameById = useMemo(() => toNameMap(objects), [objects]);

  const kpis = useMemo(() => ({
    total: timesheets.length,
    open: timesheets.filter((t) => t.checkInAt && !t.checkOutAt).length,
    late: timesheets.filter((t) => (t.lateMinutes ?? 0) > 0).length,
  }), [timesheets]);

  const openTimesheet = timesheets.find((t) => t.checkInAt && !t.checkOutAt) ?? null;

  function openCheckIn() {
    setCheckInObjectId(objects[0]?.id ?? "");
    setCheckInError("");
    setCheckInOpen(true);
  }

  async function submitCheckIn(event: FormEvent) {
    event.preventDefault();
    if (checkingIn || !ownWorkerId) return;
    if (!checkInObjectId) {
      setCheckInError("Выберите объект");
      return;
    }
    setCheckingIn(true);
    setCheckInError("");
    try {
      const created = await checkIn(ownWorkerId, checkInObjectId);
      setTimesheets((current) => [created, ...current.filter((t) => t.id !== created.id)]);
      setCheckInOpen(false);
      showToast("Приход отмечен");
    } catch (error) {
      setCheckInError(describeError(error, "Не удалось отметить приход"));
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    if (!openTimesheet || busyId) return;
    setBusyId(openTimesheet.id);
    try {
      const updated = await checkOut(openTimesheet.id);
      setTimesheets((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Уход отмечен");
    } catch (error) {
      showToast(describeError(error, "Не удалось отметить уход"), "error");
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<Timesheet>[] = [
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectNameById.get(row.objectId) ?? "—"}</span> },
    { key: "date", header: "Дата", render: (row) => <span className="text-ink-secondary">{row.date}</span> },
    { key: "checkIn", header: "Приход", render: (row) => <span className="text-ink-secondary">{row.checkInAt ? formatDushanbeTime(row.checkInAt) : "—"}</span> },
    { key: "checkOut", header: "Уход", render: (row) => <span className="text-ink-secondary">{row.checkOutAt ? formatDushanbeTime(row.checkOutAt) : "—"}</span> },
    { key: "late", header: "Опоздание", render: (row) => (row.lateMinutes ? <Badge tone="orange">{row.lateMinutes} мин</Badge> : <span className="text-ink-muted">—</span>) },
    { key: "approved", header: "Статус", render: (row) => <Badge tone={row.approvedAt ? "green" : "orange"}>{row.approvedAt ? "Утверждён" : "Ожидает"}</Badge> },
  ];

  return (
    <AppLayout
      title="Посещаемость"
      subtitle="Ваши отметки прихода и ухода"
      action={
        openTimesheet ? (
          <Button variant="secondary" disabled={busyId === openTimesheet.id} onClick={() => void handleCheckOut()}><LogOut size={15} /> Отметить уход</Button>
        ) : (
          <Button onClick={openCheckIn} disabled={objects.length === 0}><LogIn size={15} /> Отметить приход</Button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего отметок" value={String(kpis.total)} icon={CalendarCheck} tone="blue" footer="За всё время" />
        <MetricCard label="Открытая смена" value={openTimesheet ? "Да" : "Нет"} icon={CalendarCheck} tone={openTimesheet ? "orange" : "green"} footer="Отмечен приход без ухода" />
        <MetricCard label="Опозданий" value={String(kpis.late)} icon={CalendarCheck} tone="red" footer="Всего дней с опозданием" />
      </div>

      {loadState === "error" && (
        <Card style={{ marginTop: 16, padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void loadAll()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "unavailable" && (
        <Card className="mt-4 p-0">
          <ErrorState title="Учётная запись не привязана" description="Ваша учётная запись не привязана ни к одному рабочему. Обратитесь к администратору." />
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
              <EmptyState icon={CalendarCheck} title="Отметок пока нет" description="Отметьте приход, чтобы начать смену" />
            )}
          </div>
        </Card>
      )}

      <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Отметить приход" size="sm">
        <form className="users-modal-form" onSubmit={(e) => void submitCheckIn(e)}>
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
