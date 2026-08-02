import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, ClipboardList, Loader2, Package, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { ApiError, NetworkError } from "../api/apiClient";
import { completeIndividualTask, listIndividualTasks, startIndividualTask, type IndividualTask, type IndividualTaskStatus } from "../api/individualTasksApi";
import { listTimesheets, type Timesheet } from "../api/timesheetsApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.code === "WORKER_NOT_FOUND") return "Ваша учётная запись не привязана к рабочему. Обратитесь к администратору.";
    return error.message || fallback;
  }
  return fallback;
}

const STATUS_LABEL: Record<IndividualTaskStatus, string> = {
  Assigned: "Назначена",
  InProgress: "В работе",
  Done: "Выполнена",
};
const STATUS_TONE: Record<IndividualTaskStatus, "blue" | "orange" | "green"> = {
  Assigned: "blue",
  InProgress: "orange",
  Done: "green",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

/** Own-scoped composition of Tasks + Attendance data — no dedicated dashboard endpoint on the backend for Worker, same as every other page in this checkpoint. */
export default function WorkerDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<IndividualTask[]>([]);
  const [todayTimesheet, setTodayTimesheet] = useState<Timesheet | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [tasksResult, timesheetsResult] = await Promise.all([
        listIndividualTasks(1, 100),
        listTimesheets(1, 30),
      ]);
      setTasks(tasksResult.items);
      const today = new Date().toISOString().slice(0, 10);
      setTodayTimesheet(timesheetsResult.items.find((t) => t.date === today) ?? null);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.code === "WORKER_NOT_FOUND") {
        setLoadState("unavailable");
        return;
      }
      setLoadError(describeError(error, "Не удалось загрузить данные"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "Done").slice(0, 5), [tasks]);
  const kpis = useMemo(() => ({
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === "InProgress").length,
    done: tasks.filter((t) => t.status === "Done").length,
  }), [tasks]);

  async function handleStart(task: IndividualTask) {
    if (busyId) return;
    setBusyId(task.id);
    try {
      const updated = await startIndividualTask(task.id);
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Задача начата");
    } catch (error) {
      showToast(describeError(error, "Не удалось начать задачу"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(task: IndividualTask) {
    if (busyId) return;
    setBusyId(task.id);
    try {
      const updated = await completeIndividualTask(task.id);
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Задача завершена");
    } catch (error) {
      showToast(describeError(error, "Не удалось завершить задачу"), "error");
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<IndividualTask>[] = [
    { key: "title", header: "Задача", render: (row) => <span className="font-semibold text-ink">{row.title}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === "Assigned" && <Button size="sm" disabled={busyId === row.id} onClick={() => void handleStart(row)}>Начать</Button>}
          {row.status === "InProgress" && <Button size="sm" disabled={busyId === row.id} onClick={() => void handleComplete(row)}>Завершить</Button>}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title={`${greeting()}${user?.fullName ? `, ${user.fullName}` : ""}`} subtitle="Ваши задачи и посещаемость на сегодня">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Всего задач" value={String(kpis.total)} icon={ClipboardList} tone="blue" footer="Все статусы" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={ClipboardList} tone="orange" footer="Выполняются сейчас" />
        <MetricCard label="Выполнено" value={String(kpis.done)} icon={ClipboardList} tone="green" footer="Завершённые задачи" />
        <MetricCard
          label="Сегодня"
          value={todayTimesheet?.checkInAt ? (todayTimesheet.checkOutAt ? "Смена завершена" : "На смене") : "Не отмечен"}
          icon={CalendarCheck}
          tone={todayTimesheet?.checkInAt ? "green" : "red"}
          footer="Статус посещаемости"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button variant="secondary" onClick={() => navigate("/attendance")}><CalendarCheck size={15} /> Табель</Button>
        <Button variant="secondary" onClick={() => navigate("/photo-reports")}><Camera size={15} /> Фотоотчёт</Button>
        <Button variant="secondary" onClick={() => navigate("/inventory/materials")}><Package size={15} /> Материалы</Button>
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
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Текущие задачи</h2>
            <Button size="sm" variant="secondary" onClick={() => navigate("/tasks")}>Все задачи</Button>
          </div>
          <div className="mt-4">
            {activeTasks.length > 0 ? (
              <DataTable columns={columns} rows={activeTasks} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={ClipboardList} title="Активных задач нет" description="Все задачи выполнены или ещё не назначены" />
            )}
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
