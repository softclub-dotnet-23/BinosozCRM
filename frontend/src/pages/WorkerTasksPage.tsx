import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardList, Loader2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import {
  completeIndividualTask,
  listIndividualTasks,
  startIndividualTask,
  type IndividualTask,
  type IndividualTaskStatus,
} from "../api/individualTasksApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.status === 403) return "У вас нет прав для этого действия.";
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

/**
 * GET,POST /individual-tasks/{id}/start,/complete are Worker-scoped to
 * AssignedToWorkerId == own Worker row (Application/IndividualTasks/*.cs,
 * Worker-role checkpoint) — narrower than Brigadir's whole-brigade scope,
 * and a genuinely personal task list, unlike the brigade-wide WorkOrder
 * view Brigadir pages use.
 */
export default function WorkerTasksPage() {
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<IndividualTask[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | IndividualTaskStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoadState("loading");
    try {
      const result = await listIndividualTasks(1, 100);
      setTasks(result.items);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.code === "WORKER_NOT_FOUND") {
        setLoadState("unavailable");
        return;
      }
      setLoadError(describeError(error, "Не удалось загрузить задачи"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredTasks = useMemo(
    () => (statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter)),
    [tasks, statusFilter],
  );

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
    {
      key: "title",
      header: "Задача",
      render: (row) => (
        <div>
          <span className="font-semibold text-ink">{row.title}</span>
          <div className="text-xs text-ink-muted">{row.code}</div>
        </div>
      ),
    },
    { key: "description", header: "Описание", render: (row) => <span className="text-ink-secondary">{row.description ?? "—"}</span> },
    { key: "dueAt", header: "Срок", render: (row) => <span className="text-ink-secondary">{row.dueAt ? new Date(row.dueAt).toLocaleDateString("ru-RU") : "—"}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === "Assigned" && (
            <Button size="sm" disabled={busyId === row.id} onClick={() => void handleStart(row)}>Начать</Button>
          )}
          {row.status === "InProgress" && (
            <Button size="sm" disabled={busyId === row.id} onClick={() => void handleComplete(row)}>Завершить</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Мои задачи" subtitle="Личные задачи, назначенные вам">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего задач" value={String(kpis.total)} icon={ClipboardList} tone="blue" footer="Все статусы" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={ClipboardList} tone="orange" footer="Выполняются сейчас" />
        <MetricCard label="Выполнено" value={String(kpis.done)} icon={ClipboardList} tone="green" footer="Завершённые задачи" />
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
            title="Учётная запись не привязана"
            description="Ваша учётная запись не привязана ни к одному рабочему. Обратитесь к администратору."
          />
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ marginTop: 16, padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Список задач</h2>
            <CustomSelect
              size="sm"
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[{ value: "all", label: "Все статусы" }, ...(Object.keys(STATUS_LABEL) as IndividualTaskStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
            />
          </div>
          <div className="mt-4">
            {filteredTasks.length > 0 ? (
              <DataTable columns={columns} rows={filteredTasks} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={ClipboardList} title="Задачи не найдены" description="Для вас пока нет назначенных задач" />
            )}
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
