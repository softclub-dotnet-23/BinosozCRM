import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import {
  addWorkOrderProgress,
  listMyWorkOrders,
  reworkWorkOrder,
  startWorkOrder,
  submitWorkOrderForReview,
  type WorkOrder,
  type WorkOrderStatus,
} from "../api/workOrdersApi";
import { listObjectLookups, toNameMap, uniqueIds } from "../api/lookupsApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.status === 403) return "У вас нет прав для этого действия.";
    if (error.code === "WORKER_NOT_FOUND") return "Ваша учётная запись не привязана ни к одной бригаде. Обратитесь к администратору.";
    return error.message || fallback;
  }
  return fallback;
}

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  New: "Новый", Assigned: "Назначен", InProgress: "Выполняется", OnReview: "На проверке", Accepted: "Принят", Rejected: "Отклонён", Closed: "Закрыт",
};
const STATUS_TONE: Record<WorkOrderStatus, "blue" | "green" | "orange" | "purple" | "red"> = {
  New: "blue", Assigned: "blue", InProgress: "orange", OnReview: "purple", Accepted: "green", Rejected: "red", Closed: "green",
};

export default function BrigadirAssignmentsPage() {
  const { showToast } = useToast();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [objectNameById, setObjectNameById] = useState<Map<string, string>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkOrderStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [progressTarget, setProgressTarget] = useState<WorkOrder | null>(null);
  const [progressQty, setProgressQty] = useState("");
  const [progressComment, setProgressComment] = useState("");
  const [progressPhotos, setProgressPhotos] = useState<File[]>([]);
  const [progressError, setProgressError] = useState("");
  const [submittingProgress, setSubmittingProgress] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    let items: WorkOrder[];
    try {
      const result = await listMyWorkOrders(1, 100);
      items = result.items;
      setWorkOrders(items);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.code === "WORKER_NOT_FOUND") {
        setLoadState("unavailable");
        return;
      }
      setLoadError(describeError(error, "Не удалось загрузить наряды"));
      setLoadState("error");
      return;
    }

    // A failed name lookup should not take down the whole page — the table
    // still renders with objectId-keyed "—" fallbacks if this rejects.
    try {
      const ids = uniqueIds(items.map((order) => order.objectId));
      if (ids.length > 0) {
        const objects = await listObjectLookups({ ids, limit: ids.length });
        setObjectNameById(toNameMap(objects));
      }
    } catch {
      // leave objectNameById as-is; column falls back to "—"
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredOrders = useMemo(
    () => (statusFilter === "all" ? workOrders : workOrders.filter((w) => w.status === statusFilter)),
    [workOrders, statusFilter],
  );

  const kpis = useMemo(() => ({
    total: workOrders.length,
    inProgress: workOrders.filter((w) => w.status === "InProgress").length,
    onReview: workOrders.filter((w) => w.status === "OnReview").length,
    rejected: workOrders.filter((w) => w.status === "Rejected").length,
  }), [workOrders]);

  async function handleStart(order: WorkOrder) {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const updated = await startWorkOrder(order.id);
      setWorkOrders((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      showToast("Работа начата");
    } catch (error) {
      showToast(describeError(error, "Не удалось начать работу"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(order: WorkOrder) {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const updated = await submitWorkOrderForReview(order.id);
      setWorkOrders((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      showToast("Наряд отправлен на проверку");
    } catch (error) {
      showToast(describeError(error, "Не удалось отправить на проверку"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRework(order: WorkOrder) {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const updated = await reworkWorkOrder(order.id);
      setWorkOrders((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      showToast("Наряд возвращён в работу");
    } catch (error) {
      showToast(describeError(error, "Не удалось вернуть наряд в работу"), "error");
    } finally {
      setBusyId(null);
    }
  }

  function openProgress(order: WorkOrder) {
    setProgressTarget(order);
    setProgressQty("");
    setProgressComment("");
    setProgressPhotos([]);
    setProgressError("");
  }

  async function submitProgress(event: FormEvent) {
    event.preventDefault();
    if (!progressTarget || submittingProgress) return;
    const qty = Number(progressQty);
    if (!progressQty || qty <= 0) {
      setProgressError("Укажите выполненный объём больше нуля");
      return;
    }
    setSubmittingProgress(true);
    setProgressError("");
    try {
      await addWorkOrderProgress(progressTarget.id, {
        reportedQty: qty,
        comment: progressComment.trim() || undefined,
        photos: progressPhotos,
      });
      setProgressTarget(null);
      showToast("Прогресс отправлен");
    } catch (error) {
      setProgressError(describeError(error, "Не удалось отправить прогресс"));
    } finally {
      setSubmittingProgress(false);
    }
  }

  const columns: DataTableColumn<WorkOrder>[] = [
    {
      key: "code",
      header: "Наряд",
      render: (row) => (
        <div>
          <span className="font-semibold text-ink">{row.code}</span>
          <div className="text-xs text-ink-muted">{row.title}</div>
        </div>
      ),
    },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectNameById.get(row.objectId) ?? "—"}</span> },
    { key: "volume", header: "Объём", render: (row) => <span className="text-ink-secondary">{row.plannedQty} {row.unit}</span> },
    { key: "dueDate", header: "Срок", render: (row) => <span className="text-ink-secondary">{row.dueDate ?? "—"}</span> },
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
            <Button size="sm" variant="secondary" disabled={busyId === row.id} onClick={() => openProgress(row)}>Отчитаться</Button>
          )}
          {row.status === "InProgress" && (
            <Button size="sm" disabled={busyId === row.id} onClick={() => void handleSubmit(row)}>На проверку</Button>
          )}
          {row.status === "Rejected" && (
            <Button size="sm" disabled={busyId === row.id} onClick={() => void handleRework(row)}>В доработку</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Мои работы" subtitle="Наряды, назначенные вашей бригаде">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Всего нарядов" value={String(kpis.total)} icon={ClipboardList} tone="blue" footer="Все статусы" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={ClipboardList} tone="orange" footer="Выполняются сейчас" />
        <MetricCard label="На проверке" value={String(kpis.onReview)} icon={ClipboardList} tone="purple" footer="Ждут решения прораба" />
        <MetricCard label="Отклонено" value={String(kpis.rejected)} icon={ClipboardList} tone="red" footer="Требуют доработки" />
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
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Список нарядов</h2>
            <CustomSelect
              size="sm"
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[{ value: "all", label: "Все статусы" }, ...(Object.keys(STATUS_LABEL) as WorkOrderStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
            />
          </div>
          <div className="mt-4">
            {filteredOrders.length > 0 ? (
              <DataTable columns={columns} rows={filteredOrders} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={ClipboardList} title="Наряды не найдены" description="Для вашей бригады пока нет назначенных нарядов" />
            )}
          </div>
        </Card>
      )}

      <Modal open={progressTarget !== null} onClose={() => setProgressTarget(null)} title="Отчитаться о прогрессе" description={progressTarget?.code} size="sm">
        <form className="users-modal-form" onSubmit={submitProgress}>
          <label><span>Выполненный объём</span><input type="number" min="0" step="0.01" value={progressQty} onChange={(e) => setProgressQty(e.target.value)} autoFocus /></label>
          <label><span>Комментарий</span><input value={progressComment} onChange={(e) => setProgressComment(e.target.value)} placeholder="Необязательно" /></label>
          <label><span>Фото</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setProgressPhotos(Array.from(e.target.files ?? []))} /></label>
          {progressError && <p className="users-modal-error" role="alert">{progressError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setProgressTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={submittingProgress}>{submittingProgress ? "Отправка..." : "Отправить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
