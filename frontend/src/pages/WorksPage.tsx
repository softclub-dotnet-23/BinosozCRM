import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ClipboardList, Loader2, Plus } from "lucide-react";
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
import {
  acceptWorkOrder,
  assignWorkOrder,
  closeWorkOrder,
  createWorkOrder,
  getWorkOrderLog,
  listWorkOrders,
  rejectWorkOrder,
  type TaskLogEntry,
  type WorkOrder,
  type WorkOrderStatus,
} from "../api/workOrdersApi";
import { listObjects, type ConstructionObject } from "../api/objectsApi";
import { listBrigades, type Brigade } from "../api/brigadesApi";
import { formatCurrency } from "../utils/format";
import BrigadirAssignmentsPage from "./BrigadirAssignmentsPage";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  New: "Новый", Assigned: "Назначен", InProgress: "Выполняется", OnReview: "На проверке", Accepted: "Принят", Rejected: "Отклонён", Closed: "Закрыт",
};
const STATUS_TONE: Record<WorkOrderStatus, "blue" | "green" | "orange" | "purple" | "red"> = {
  New: "blue", Assigned: "blue", InProgress: "orange", OnReview: "purple", Accepted: "green", Rejected: "red", Closed: "green",
};

const CREATE_FORM_INITIAL = { objectId: "", brigadeId: "", title: "", unit: "", plannedQty: "", unitPrice: "", dueDate: "" };

export default function WorksPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirAssignmentsPage />;
  return <CompanyWorksPage />;
}

function CompanyWorksPage() {
  const { showToast } = useToast();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkOrderStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<WorkOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [logTarget, setLogTarget] = useState<WorkOrder | null>(null);
  const [logEntries, setLogEntries] = useState<TaskLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [ordersResult, objectsResult, brigadesResult] = await Promise.all([
        listWorkOrders(1, 100),
        listObjects(1, 100),
        listBrigades(1, 100),
      ]);
      setWorkOrders(ordersResult.items);
      setObjects(objectsResult.items);
      setBrigades(brigadesResult.items);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить наряды"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const objectNameById = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);
  const brigadeNameById = useMemo(() => new Map(brigades.map((b) => [b.id, b.name])), [brigades]);

  const filteredOrders = useMemo(
    () => (statusFilter === "all" ? workOrders : workOrders.filter((w) => w.status === statusFilter)),
    [workOrders, statusFilter],
  );

  const kpis = useMemo(() => ({
    total: workOrders.length,
    inProgress: workOrders.filter((w) => w.status === "InProgress" || w.status === "Assigned").length,
    onReview: workOrders.filter((w) => w.status === "OnReview").length,
    closed: workOrders.filter((w) => w.status === "Closed").length,
  }), [workOrders]);

  function openCreate() {
    setCreateForm({ ...CREATE_FORM_INITIAL, objectId: objects[0]?.id ?? "", brigadeId: brigades[0]?.id ?? "" });
    setCreateError("");
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    const { objectId, brigadeId, title, unit, plannedQty, unitPrice } = createForm;
    if (!objectId || !brigadeId || !title.trim() || !unit.trim() || !plannedQty || !unitPrice) {
      setCreateError("Заполните объект, бригаду, название, единицу, объём и цену");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createWorkOrder({
        objectId,
        brigadeId,
        title: title.trim(),
        unit: unit.trim(),
        plannedQty: Number(plannedQty),
        unitPrice: Number(unitPrice),
        dueDate: createForm.dueDate || undefined,
      });
      setWorkOrders((current) => [created, ...current]);
      setCreateOpen(false);
      showToast("Наряд создан");
    } catch (error) {
      setCreateError(describeError(error, "Не удалось создать наряд"));
    } finally {
      setCreating(false);
    }
  }

  async function handleAssign(order: WorkOrder) {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const updated = await assignWorkOrder(order.id);
      setWorkOrders((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      showToast("Наряд назначен бригаде");
    } catch (error) {
      showToast(describeError(error, "Не удалось назначить наряд"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccept(order: WorkOrder) {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const updated = await acceptWorkOrder(order.id);
      setWorkOrders((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      showToast("Наряд принят");
    } catch (error) {
      showToast(describeError(error, "Не удалось принять наряд"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClose(order: WorkOrder) {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const updated = await closeWorkOrder(order.id);
      setWorkOrders((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      showToast("Наряд закрыт");
    } catch (error) {
      showToast(describeError(error, "Не удалось закрыть наряд"), "error");
    } finally {
      setBusyId(null);
    }
  }

  function openReject(order: WorkOrder) {
    setRejectTarget(order);
    setRejectReason("");
    setRejectError("");
  }

  async function submitReject(event: FormEvent) {
    event.preventDefault();
    if (!rejectTarget || rejecting) return;
    if (!rejectReason.trim()) {
      setRejectError("Укажите причину отклонения");
      return;
    }
    setRejecting(true);
    setRejectError("");
    try {
      const updated = await rejectWorkOrder(rejectTarget.id, rejectReason.trim());
      setWorkOrders((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      setRejectTarget(null);
      showToast("Наряд отклонён");
    } catch (error) {
      setRejectError(describeError(error, "Не удалось отклонить наряд"));
    } finally {
      setRejecting(false);
    }
  }

  async function openLog(order: WorkOrder) {
    setLogTarget(order);
    setLogEntries([]);
    setLogLoading(true);
    try {
      setLogEntries(await getWorkOrderLog(order.id));
    } catch {
      // log is supplementary — the drawer still shows the order's own fields without it
    } finally {
      setLogLoading(false);
    }
  }

  const columns: DataTableColumn<WorkOrder>[] = [
    { key: "code", header: "Наряд", render: (row) => <div><span className="font-semibold text-ink">{row.code}</span><div className="text-xs text-ink-muted">{row.title}</div></div> },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectNameById.get(row.objectId) ?? "—"}</span> },
    { key: "brigade", header: "Бригада", render: (row) => <span className="text-ink-secondary">{brigadeNameById.get(row.brigadeId) ?? "—"}</span> },
    { key: "volume", header: "Объём", render: (row) => <span className="text-ink-secondary">{row.plannedQty} {row.unit}</span> },
    { key: "price", header: "Сумма", render: (row) => <span className="tabular text-ink">{formatCurrency(row.plannedQty * row.unitPrice)}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => void openLog(row)}>История</Button>
          {row.status === "New" && <Button size="sm" disabled={busyId === row.id} onClick={() => void handleAssign(row)}>Назначить</Button>}
          {row.status === "OnReview" && (
            <>
              <Button size="sm" disabled={busyId === row.id} onClick={() => void handleAccept(row)}>Принять</Button>
              <Button size="sm" variant="danger" disabled={busyId === row.id} onClick={() => openReject(row)}>Отклонить</Button>
            </>
          )}
          {row.status === "Accepted" && <Button size="sm" disabled={busyId === row.id} onClick={() => void handleClose(row)}>Закрыть</Button>}
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Наряды"
      subtitle="Наряды на работы для бригад"
      action={<Button onClick={openCreate} disabled={objects.length === 0 || brigades.length === 0}><Plus size={15} /> Создать наряд</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Всего нарядов" value={String(kpis.total)} icon={ClipboardList} tone="orange" footer="Все наряды" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={ClipboardList} tone="blue" footer="Назначены или выполняются" />
        <MetricCard label="На проверке" value={String(kpis.onReview)} icon={ClipboardList} tone="purple" footer="Ждут решения" />
        <MetricCard label="Закрыты" value={String(kpis.closed)} icon={ClipboardList} tone="green" footer="Завершённые наряды" />
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
              <EmptyState icon={ClipboardList} title="Наряды не найдены" description="Создайте первый наряд" />
            )}
          </div>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Создать наряд" size="md">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label><span>Объект</span><CustomSelect fullWidth value={createForm.objectId} onValueChange={(v) => setCreateForm((f) => ({ ...f, objectId: v }))} options={objects.map((o) => ({ value: o.id, label: o.name }))} /></label>
          <label><span>Бригада</span><CustomSelect fullWidth value={createForm.brigadeId} onValueChange={(v) => setCreateForm((f) => ({ ...f, brigadeId: v }))} options={brigades.map((b) => ({ value: b.id, label: b.name }))} /></label>
          <label><span>Название</span><input value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} placeholder="Штукатурка стен" autoFocus /></label>
          <label><span>Единица измерения</span><input value={createForm.unit} onChange={(e) => setCreateForm((f) => ({ ...f, unit: e.target.value }))} placeholder="м²" /></label>
          <label><span>Плановый объём</span><input type="number" min="0" step="0.01" value={createForm.plannedQty} onChange={(e) => setCreateForm((f) => ({ ...f, plannedQty: e.target.value }))} /></label>
          <label><span>Цена за единицу</span><input type="number" min="0" step="0.01" value={createForm.unitPrice} onChange={(e) => setCreateForm((f) => ({ ...f, unitPrice: e.target.value }))} /></label>
          <label><span>Срок</span><input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))} /></label>
          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creating}>{creating ? "Создание..." : "Создать"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={rejectTarget !== null} onClose={() => setRejectTarget(null)} title="Отклонить наряд" description={rejectTarget?.code} size="sm">
        <form className="users-modal-form" onSubmit={submitReject}>
          <label><span>Причина</span><input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} autoFocus /></label>
          {rejectError && <p className="users-modal-error" role="alert">{rejectError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setRejectTarget(null)}>Отмена</Button>
            <Button type="submit" variant="danger" disabled={rejecting}>{rejecting ? "Сохранение..." : "Отклонить"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={logTarget !== null} onClose={() => setLogTarget(null)} title="История наряда" description={logTarget?.code} size="sm">
        <div className="users-modal-form">
          {logLoading && <p className="text-sm text-ink-muted">Загрузка...</p>}
          {!logLoading && logEntries.length === 0 && <p className="text-sm text-ink-muted">Изменений пока нет</p>}
          {logEntries.map((entry) => (
            <div key={entry.id} className="rounded-lg bg-[#F5F5F4] px-3 py-2 text-sm">
              <div className="font-medium text-ink">{entry.fromStatus} → {entry.toStatus}</div>
              <div className="text-xs text-ink-muted">{new Date(entry.changedAt).toLocaleString("ru-RU")}</div>
              {entry.comment && <div className="mt-1 text-ink-secondary">{entry.comment}</div>}
            </div>
          ))}
          <div className="users-modal-actions"><Button type="button" variant="secondary" onClick={() => setLogTarget(null)}>Закрыть</Button></div>
        </div>
      </Modal>
    </AppLayout>
  );
}
