import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardList, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { CardSkeleton } from "../components/ui/Skeleton";
import { ShiftStatusCard } from "../components/worker/ShiftStatusCard";
import { WorkerKpiRow } from "../components/worker/WorkerKpiRow";
import { ActiveTaskCard } from "../components/worker/ActiveTaskCard";
import { QuickActionsRow } from "../components/worker/QuickActionsRow";
import { UpcomingTimeline } from "../components/worker/UpcomingTimeline";
import { LatestMaterialRequestCard } from "../components/worker/LatestMaterialRequestCard";
import { PhotoReportModal } from "../components/worker/PhotoReportModal";
import { MaterialRequestModal } from "../components/worker/MaterialRequestModal";
import { IssueReportModal } from "../components/worker/IssueReportModal";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { ApiError, NetworkError } from "../api/apiClient";
import { completeIndividualTask, listIndividualTasks, startIndividualTask, type IndividualTask } from "../api/individualTasksApi";
import { listTimesheets, type Timesheet } from "../api/timesheetsApi";
import { getMyWorkerProfile, type Worker } from "../api/workersApi";
import { getMyBrigade, type Brigade } from "../api/brigadesApi";
import { listMyWorkOrderProgress, listMyWorkOrders, type WorkOrder, type WorkOrderProgress } from "../api/workOrdersApi";
import { listMaterialRequests, type MaterialRequest } from "../api/materialRequestsApi";
import { listObjectLookups, toNameMap, type LookupItem } from "../api/lookupsApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.code === "WORKER_NOT_FOUND") return "Ваша учётная запись не привязана к рабочему. Обратитесь к администратору.";
    return error.message || fallback;
  }
  return fallback;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

/**
 * Composes: own tasks (IndividualTask), today's Timesheet, own brigade
 * (GET /brigades/mine, widened to Worker), own progress-report history
 * (GET /work-orders/progress/mine), own work orders (for the photo-report
 * quick action's eligible-order picker), own material requests, and object
 * lookups for name resolution — every value below traces to one of these,
 * no dashboard aggregate endpoint exists or was worth adding for this many
 * already-small, already-cached-elsewhere queries.
 */
export default function WorkerDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [brigade, setBrigade] = useState<Brigade | null>(null);
  const [tasks, setTasks] = useState<IndividualTask[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [progressReports, setProgressReports] = useState<WorkOrderProgress[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [objects, setObjects] = useState<LookupItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [photoReportTarget, setPhotoReportTarget] = useState<WorkOrder | null>(null);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [workerProfile, tasksResult, timesheetsResult, brigadeResult, progressResult, workOrdersResult, materialRequestsResult] = await Promise.all([
        getMyWorkerProfile(),
        listIndividualTasks(1, 100),
        listTimesheets(1, 30),
        getMyBrigade(),
        listMyWorkOrderProgress(1, 50),
        listMyWorkOrders(1, 100),
        listMaterialRequests(1, 1),
      ]);
      setWorker(workerProfile);
      setTasks(tasksResult.items);
      setTimesheets(timesheetsResult.items);
      setBrigade(brigadeResult);
      setProgressReports(progressResult.items);
      setWorkOrders(workOrdersResult.items);
      setMaterialRequests(materialRequestsResult.items);

      const objectIds = Array.from(new Set(workOrdersResult.items.map((w) => w.objectId)));
      if (objectIds.length > 0) {
        const objectsResult = await listObjectLookups({ ids: objectIds, limit: objectIds.length });
        setObjects(objectsResult);
      } else {
        setObjects([]);
      }

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

  const objectNameById = useMemo(() => toNameMap(objects), [objects]);
  const today = new Date().toISOString().slice(0, 10);
  const todayTimesheet = useMemo(() => timesheets.find((t) => t.date === today) ?? null, [timesheets, today]);
  const activeTask = useMemo(
    () => tasks.find((t) => t.status === "InProgress") ?? tasks.find((t) => t.status === "Assigned") ?? null,
    [tasks],
  );
  const eligiblePhotoReportOrders = useMemo(() => workOrders.filter((w) => w.status === "InProgress"), [workOrders]);
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }, [search, tasks]);

  async function handleStart(task: IndividualTask) {
    if (busyTaskId) return;
    setBusyTaskId(task.id);
    try {
      const updated = await startIndividualTask(task.id);
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Задача начата");
    } catch (error) {
      showToast(describeError(error, "Не удалось начать задачу"), "error");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleComplete(task: IndividualTask) {
    if (busyTaskId) return;
    setBusyTaskId(task.id);
    try {
      const updated = await completeIndividualTask(task.id);
      setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Задача завершена");
    } catch (error) {
      showToast(describeError(error, "Не удалось завершить задачу"), "error");
    } finally {
      setBusyTaskId(null);
    }
  }

  function openPhotoReportFor(workOrderId: string) {
    const order = workOrders.find((w) => w.id === workOrderId) ?? eligiblePhotoReportOrders[0] ?? null;
    setPhotoReportTarget(order);
  }

  return (
    <AppLayout
      title={`${greeting()}${user?.fullName ? `, ${user.fullName}` : ""}`}
      subtitle="Вот ваш план на сегодня"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск по задачам..." }}
    >
      {loadState === "error" && (
        <Card style={{ padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void loadAll()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "unavailable" && (
        <Card className="p-0">
          <ErrorState title="Учётная запись не привязана" description="Ваша учётная запись не привязана ни к одному рабочему. Обратитесь к администратору." />
        </Card>
      )}

      {loadState === "loading" && (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        </div>
      )}

      {loadState === "ready" && searchResults && (
        <Card className="p-0">
          <div className="flex items-center gap-2 px-5 pt-5 sm:px-6"><Search size={16} className="text-ink-muted" /><h2 className="text-[17px] font-bold text-ink">Результаты поиска</h2></div>
          <div className="mt-3 px-5 pb-5 sm:px-6">
            {searchResults.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Ничего не найдено" description="Попробуйте другой запрос" />
            ) : (
              <ul className="divide-y divide-border">
                {searchResults.map((t) => (
                  <li key={t.id}>
                    <button type="button" className="flex w-full items-center justify-between gap-2 py-3 text-left" onClick={() => navigate("/tasks")}>
                      <span className="text-sm font-medium text-ink">{t.title}</span>
                      <span className="text-xs text-ink-muted">{t.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {loadState === "ready" && !searchResults && worker && (
        <div className="space-y-4">
          <ShiftStatusCard
            ownWorkerId={worker.id}
            brigade={brigade}
            todayTimesheet={todayTimesheet}
            objects={objects}
            objectNameById={objectNameById}
            hasActiveTask={!!activeTask}
            onCheckedIn={(t) => {
              setTimesheets((current) => [t, ...current.filter((x) => x.id !== t.id)]);
              showToast("Приход отмечен");
            }}
            onCheckedOut={(t) => {
              setTimesheets((current) => current.map((x) => (x.id === t.id ? t : x)));
              showToast("Уход отмечен");
            }}
          />

          <WorkerKpiRow tasks={tasks} progressReports={progressReports} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <ActiveTaskCard
                task={activeTask}
                brigadeName={brigade?.name ?? null}
                busy={busyTaskId !== null}
                onStart={(t) => void handleStart(t)}
                onComplete={(t) => void handleComplete(t)}
                onAddPhoto={openPhotoReportFor}
              />
              <QuickActionsRow
                onPhotoReport={() => openPhotoReportFor(activeTask?.workOrderId ?? "")}
                onMaterialRequest={() => setMaterialModalOpen(true)}
                onIssueReport={() => setIssueModalOpen(true)}
                photoReportDisabled={eligiblePhotoReportOrders.length === 0}
              />
            </div>
            <div className="space-y-4">
              <UpcomingTimeline tasks={tasks} />
              <LatestMaterialRequestCard request={materialRequests[0] ?? null} />
            </div>
          </div>
        </div>
      )}

      <PhotoReportModal
        workOrder={photoReportTarget}
        onClose={() => setPhotoReportTarget(null)}
        onSuccess={(created) => {
          setProgressReports((current) => [created, ...current]);
          showToast("Фотоотчёт отправлен");
        }}
      />

      <MaterialRequestModal
        open={materialModalOpen}
        objectId={activeTask ? (workOrders.find((w) => w.id === activeTask.workOrderId)?.objectId ?? objects[0]?.id ?? "") : (objects[0]?.id ?? "")}
        onClose={() => setMaterialModalOpen(false)}
        onSuccess={(created) => {
          setMaterialRequests((current) => [created, ...current]);
          showToast("Заявка отправлена");
        }}
      />

      <IssueReportModal
        open={issueModalOpen}
        objectId={activeTask ? (workOrders.find((w) => w.id === activeTask.workOrderId)?.objectId ?? objects[0]?.id ?? "") : (objects[0]?.id ?? "")}
        individualTaskId={activeTask?.id}
        onClose={() => setIssueModalOpen(false)}
        onSuccess={() => showToast("Сообщение о проблеме отправлено")}
      />
    </AppLayout>
  );
}
