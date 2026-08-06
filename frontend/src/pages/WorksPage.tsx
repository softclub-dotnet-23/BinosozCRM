import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Lock, Plus, ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { CustomSelect } from "../components/ui/CustomSelect";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import {
  useWorkOrders,
  useCreateWorkOrder,
  useAssignWorkOrder,
  useAcceptWorkOrder,
  useRejectWorkOrder,
  useCloseWorkOrder,
} from "../hooks/api/useWorkOrders";
import { useObjects } from "../hooks/api/useObjects";
import { useBrigades } from "../hooks/api/useBrigades";
import { normalizeApiError } from "../services/apiError";
import { WorkOrderStatus } from "../services/types";
import type { WorkOrderDto } from "../services/workOrdersApi";
import { formatCurrency } from "../utils/format";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.New]: "Новый",
  [WorkOrderStatus.Assigned]: "Назначен",
  [WorkOrderStatus.InProgress]: "В работе",
  [WorkOrderStatus.OnReview]: "На проверке",
  [WorkOrderStatus.Accepted]: "Принят",
  [WorkOrderStatus.Rejected]: "Отклонён",
  [WorkOrderStatus.Closed]: "Закрыт",
};

const STATUS_TONE: Record<WorkOrderStatus, "purple" | "blue" | "orange" | "green" | "red"> = {
  [WorkOrderStatus.New]: "purple",
  [WorkOrderStatus.Assigned]: "blue",
  [WorkOrderStatus.InProgress]: "orange",
  [WorkOrderStatus.OnReview]: "blue",
  [WorkOrderStatus.Accepted]: "green",
  [WorkOrderStatus.Rejected]: "red",
  [WorkOrderStatus.Closed]: "green",
};

/** Owner/Prorab side of WorkOrdersController: create, list, assign to a brigade, accept/reject
 * a submitted order, close. The Brigadir-reachable half (start/submit/rework/progress) is its
 * own page — see WorkOrdersPage.tsx. */
export default function WorksPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<WorkOrderDto | null>(null);

  const { data, isLoading, isError, error, refetch } = useWorkOrders({ page, pageSize: PAGE_SIZE });
  const { data: objectsData } = useObjects({ page: 1, pageSize: 200 });
  const { data: brigadesData } = useBrigades({ page: 1, pageSize: 200 });
  const objects = objectsData?.items ?? [];
  const brigades = brigadesData?.items ?? [];
  const objectName = (id: string) => objects.find((o) => o.id === id)?.name ?? "—";
  const brigadeName = (id: string) => brigades.find((b) => b.id === id)?.name ?? "—";

  const createMutation = useCreateWorkOrder();
  const assignMutation = useAssignWorkOrder();
  const acceptMutation = useAcceptWorkOrder();
  const rejectMutation = useRejectWorkOrder();
  const closeMutation = useCloseWorkOrder();

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  const kpis = useMemo(() => {
    const inProgress = rows.filter((w) => w.status === WorkOrderStatus.InProgress).length;
    const onReview = rows.filter((w) => w.status === WorkOrderStatus.OnReview).length;
    const closed = rows.filter((w) => w.status === WorkOrderStatus.Closed).length;
    return { total: rows.length, inProgress, onReview, closed };
  }, [rows]);

  const columns: DataTableColumn<WorkOrderDto>[] = [
    { key: "code", header: "Наряд", sticky: "left", width: "120px", render: (row) => <span className="font-semibold text-ink">{row.code}</span> },
    { key: "title", header: "Работа", render: (row) => <span className="text-ink">{row.title}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectName(row.objectId)}</span> },
    { key: "brigade", header: "Бригада", render: (row) => <span className="text-ink-secondary">{brigadeName(row.brigadeId)}</span> },
    { key: "amount", header: "Сумма", render: (row) => <span className="tabular text-ink">{formatCurrency(row.plannedQty * row.unitPrice)}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "actions",
      header: "",
      width: "48px",
      sticky: "right",
      render: (row) => (
        <div className="flex items-center justify-end">
          <DropdownMenu
            trigger={<ClipboardCheck size={16} />}
            items={[
              { label: "Назначить бригаде", icon: <UserPlus size={14} />, onClick: () => assignMutation.mutate({ workOrderId: row.id }), disabled: row.status !== WorkOrderStatus.New },
              { label: "Принять", icon: <ThumbsUp size={14} />, onClick: () => acceptMutation.mutate({ workOrderId: row.id }), disabled: row.status !== WorkOrderStatus.OnReview },
              { label: "Отклонить", icon: <ThumbsDown size={14} />, onClick: () => setRejectTarget(row), disabled: row.status !== WorkOrderStatus.OnReview },
              { label: "Закрыть", icon: <Lock size={14} />, onClick: () => closeMutation.mutate(row.id), disabled: row.status !== WorkOrderStatus.Accepted },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Наряды"
      subtitle="Наряды на работы по объектам и бригадам"
      action={<Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Новый наряд</Button>}
    >
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Всего на странице" value={String(kpis.total)} icon={ClipboardCheck} tone="blue" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={ClipboardCheck} tone="orange" />
        <MetricCard label="На проверке" value={String(kpis.onReview)} icon={ClipboardCheck} tone="purple" />
        <MetricCard label="Закрыто" value={String(kpis.closed)} icon={CheckCircle2} tone="green" />
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4">{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}</div>
        ) : isError ? (
          <EmptyState icon={AlertCircle} title="Не удалось загрузить наряды" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
        ) : rows.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Нарядов пока нет" description="Создайте первый наряд" />
        ) : (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
            {data && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-ink-secondary">
                <span>Страница {page} из {pageCount}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</Button>
                  <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Далее</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <CreateWorkOrderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        objects={objects}
        brigades={brigades}
        submitting={createMutation.isPending}
        onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
      />

      <RejectWorkOrderModal
        target={rejectTarget}
        submitting={rejectMutation.isPending}
        onClose={() => setRejectTarget(null)}
        onSubmit={(reason) => rejectTarget && rejectMutation.mutate({ workOrderId: rejectTarget.id, reason }, { onSuccess: () => setRejectTarget(null) })}
      />
    </AppLayout>
  );
}

function CreateWorkOrderModal({
  open,
  onClose,
  objects,
  brigades,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  objects: { id: string; name: string }[];
  brigades: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (request: { objectId: string; brigadeId: string; title: string; unit: string; plannedQty: number; unitPrice: number; dueDate?: string | null }) => void;
}) {
  const [objectId, setObjectId] = useState("");
  const [brigadeId, setBrigadeId] = useState("");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [plannedQty, setPlannedQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");

  function reset() { setObjectId(""); setBrigadeId(""); setTitle(""); setUnit(""); setPlannedQty(""); setUnitPrice(""); setDueDate(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const qty = Number(plannedQty);
    const price = Number(unitPrice);
    if (!objectId || !brigadeId || !title.trim() || !unit.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
      return setError("Заполните обязательные поля корректными значениями");
    }
    onSubmit({ objectId, brigadeId, title: title.trim(), unit: unit.trim(), plannedQty: qty, unitPrice: price, dueDate: dueDate || null });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Новый наряд" size="md">
      <form className="users-modal-form" onSubmit={handleSubmit}>
        <label><span>Объект</span><CustomSelect fullWidth value={objectId} onValueChange={setObjectId} placeholder="Выберите объект" options={objects.map((o) => ({ value: o.id, label: o.name }))} /></label>
        <label><span>Бригада</span><CustomSelect fullWidth value={brigadeId} onValueChange={setBrigadeId} placeholder="Выберите бригаду" options={brigades.map((b) => ({ value: b.id, label: b.name }))} /></label>
        <label><span>Название работы</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заливка фундамента" /></label>
        <label><span>Единица измерения</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="м³" /></label>
        <label><span>Плановое количество</span><input type="number" min="0" step="0.01" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} /></label>
        <label><span>Цена за единицу</span><input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></label>
        <label><span>Срок</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Создание..." : "Создать"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RejectWorkOrderModal({ target, submitting, onClose, onSubmit }: { target: WorkOrderDto | null; submitting: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal open={target !== null} onClose={onClose} title="Отклонить наряд" description={target?.title} size="sm">
      <div className="users-modal-form">
        <label><span>Причина отклонения</span><textarea className="setting-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="button" variant="danger" disabled={submitting || !reason.trim()} onClick={() => onSubmit(reason.trim())}>{submitting ? "Отклонение..." : "Отклонить"}</Button>
        </div>
      </div>
    </Modal>
  );
}
