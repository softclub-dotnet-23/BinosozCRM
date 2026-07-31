import { useState, type FormEvent } from "react";
import { AlertCircle, Ban, Check, PackageSearch, Plus, XOctagon } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { BackendSessionRequired } from "../components/auth/BackendSessionRequired";
import { useAuth } from "../context/AuthContext";
import {
  useApproveMaterialRequest,
  useCreateMaterialRequest,
  useForceCloseMaterialRequest,
  useMaterialRequests,
  useRejectMaterialRequest,
} from "../hooks/api/useMaterialRequests";
import { normalizeApiError } from "../services/apiError";
import { MATERIAL_REQUEST_STATUS_LABEL, MaterialRequestStatus } from "../services/types";
import type { MaterialRequestDto } from "../services/materialRequestsApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

const STATUS_TONE: Record<MaterialRequestStatus, "blue" | "orange" | "green" | "purple" | "red"> = {
  [MaterialRequestStatus.Requested]: "orange",
  [MaterialRequestStatus.Approved]: "blue",
  [MaterialRequestStatus.Ordered]: "purple",
  [MaterialRequestStatus.PartiallyDelivered]: "orange",
  [MaterialRequestStatus.Delivered]: "green",
  [MaterialRequestStatus.Rejected]: "red",
};

/**
 * Dedicated page for MaterialRequestsController (api/v1/material-requests). No existing frontend
 * page represented this concept (MaterialsPage.tsx is a catalog/stock view with no backend CRUD
 * at all; ReceiptsPage/WriteOffsPage are structurally different — multi-line documents vs this
 * backend's one-material-per-record model), so this is new rather than a retrofit.
 */
export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const isBackendSession = user?.isBackendSession ?? false;
  const isBrigadir = isBackendSession && user?.role === "brigadir";
  const canDecide = isBackendSession && (user?.role === "owner" || user?.role === "prorab");

  const [page, setPage] = useState(1);
  // GET /material-requests is [Authorize(Roles = "Owner,Prorab")] — Brigadir gets a real 403, so
  // the query only fires for canDecide roles; Brigadir sees a create-only panel instead. Gated on
  // isBackendSession too: a mock session has no JWT at all, so the request must never fire even if
  // the mock role string happens to also be "owner"/"prorab" (see SessionUser.isBackendSession).
  const { data, isLoading, isError, error, refetch } = useMaterialRequests({ page, pageSize: PAGE_SIZE }, canDecide);

  const [createOpen, setCreateOpen] = useState(false);
  const [forceCloseTarget, setForceCloseTarget] = useState<MaterialRequestDto | null>(null);

  const createMutation = useCreateMaterialRequest();
  const approveMutation = useApproveMaterialRequest();
  const rejectMutation = useRejectMaterialRequest();
  const forceCloseMutation = useForceCloseMaterialRequest();

  const columns: DataTableColumn<MaterialRequestDto>[] = [
    {
      key: "material",
      header: "Материал",
      sticky: "left",
      width: "180px",
      render: (row) => (
        <div>
          <p className="truncate font-semibold text-ink">{row.materialName}</p>
          <p className="text-xs text-ink-secondary">
            {row.qty} {row.unit}
            {row.qtyDelivered > 0 && ` (доставлено: ${row.qtyDelivered})`}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge tone={STATUS_TONE[row.status]}>{MATERIAL_REQUEST_STATUS_LABEL[row.status]}</Badge>
          {row.isOverDelivered && <Badge tone="orange">перепоставка</Badge>}
        </div>
      ),
    },
    {
      key: "requestedAt",
      header: "Запрошено",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{formatDateShort(row.requestedAt)}</span>,
    },
    {
      key: "comment",
      header: "Комментарий",
      render: (row) => <span className="text-ink-secondary">{row.comment || "—"}</span>,
    },
    {
      key: "actions",
      header: "Действия",
      sticky: "right",
      width: "260px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {canDecide && row.status === MaterialRequestStatus.Requested && (
            <>
              <Button size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(row.id)}>
                <Check size={13} /> Одобрить
              </Button>
              <Button size="sm" variant="outline" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate(row.id)}>
                <Ban size={13} /> Отклонить
              </Button>
            </>
          )}
          {canDecide && (row.status === MaterialRequestStatus.Approved || row.status === MaterialRequestStatus.Ordered || row.status === MaterialRequestStatus.PartiallyDelivered) && (
            <Button size="sm" variant="outline" onClick={() => setForceCloseTarget(row)}>
              <XOctagon size={13} /> Закрыть принудительно
            </Button>
          )}
        </div>
      ),
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout
      title="Заявки на материалы"
      subtitle={isBrigadir ? "Заявки вашей бригады" : "Заявки по вашим объектам"}
      action={
        isBrigadir ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Новая заявка
          </Button>
        ) : undefined
      }
    >
      {!isBackendSession ? (
        <BackendSessionRequired roleHint="Owner или Prorab" />
      ) : canDecide ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список заявок</h2>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="px-5 sm:px-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={5} />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon={AlertCircle}
                title="Не удалось загрузить заявки"
                description={normalizeApiError(error).message}
                action={
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Повторить
                  </Button>
                }
              />
            ) : rows.length > 0 ? (
              <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={PackageSearch} title="Заявок пока нет" description="Заявки появятся после создания бригадиром" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="заявок"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <p className="text-sm text-ink-secondary">
            Backend не предоставляет вашей роли список заявок (GET /material-requests доступен только Owner/Prorab) — используйте
            кнопку «Новая заявка», чтобы создать заявку для вашей бригады.
          </p>
        </Card>
      )}

      {isBrigadir && (
        <CreateRequestModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
          submitting={createMutation.isPending}
        />
      )}

      <ForceCloseModal
        target={forceCloseTarget}
        onClose={() => setForceCloseTarget(null)}
        onSubmit={(comment) =>
          forceCloseTarget &&
          forceCloseMutation.mutate(
            { materialRequestId: forceCloseTarget.id, request: { comment } },
            { onSuccess: () => setForceCloseTarget(null) },
          )
        }
        submitting={forceCloseMutation.isPending}
      />
    </AppLayout>
  );
}

function CreateRequestModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: { objectId: string; materialName: string; unit: string; qty: number }) => void;
  submitting: boolean;
}) {
  const [objectId, setObjectId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !objectId.trim() || !materialName.trim() || !unit.trim() || !qty.trim()) return;
    onSubmit({ objectId: objectId.trim(), materialName: materialName.trim(), unit: unit.trim(), qty: Number(qty) });
  }

  return (
    <Modal open={open} onClose={onClose} title="Новая заявка на материалы">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="mr-object-id">
            ID объекта
          </label>
          <input
            id="mr-object-id"
            required
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            placeholder="GUID объекта"
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="mr-material">
            Название материала
          </label>
          <input
            id="mr-material"
            required
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="mr-unit">
              Единица измерения
            </label>
            <input
              id="mr-unit"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="кг, шт, м³..."
              className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="mr-qty">
              Количество
            </label>
            <input
              id="mr-qty"
              type="number"
              min="0"
              step="0.01"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Создание..." : "Создать"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ForceCloseModal({
  target,
  onClose,
  onSubmit,
  submitting,
}: {
  target: MaterialRequestDto | null;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  submitting: boolean;
}) {
  const [comment, setComment] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !comment.trim()) return;
    onSubmit(comment.trim());
    setComment("");
  }

  return (
    <Modal open={Boolean(target)} onClose={onClose} title={`Закрыть принудительно${target ? `: ${target.materialName}` : ""}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="force-close-comment">
            Комментарий (обязательно)
          </label>
          <textarea
            id="force-close-comment"
            required
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" variant="danger" disabled={submitting}>
            {submitting ? "Закрытие..." : "Закрыть"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
