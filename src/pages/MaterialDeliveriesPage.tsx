import { useState, type FormEvent } from "react";
import { AlertCircle, Plus, Truck } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { BackendSessionRequired } from "../components/auth/BackendSessionRequired";
import { useAuth } from "../context/AuthContext";
import { useCreateMaterialDelivery, useMaterialDeliveries } from "../hooks/api/useMaterialDeliveries";
import { normalizeApiError } from "../services/apiError";
import type { MaterialDeliveryDto } from "../services/materialDeliveriesApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

/**
 * Dedicated page for MaterialDeliveriesController (api/v1/material-deliveries) — Owner/Prorab
 * only, both list and create. Conceptually close to "Поступления" (ReceiptsPage.tsx) but that
 * page's mock model groups several materials under one receipt document; this DTO is strictly
 * one material per delivery record with no document grouping, so it's a dedicated page.
 */
export default function MaterialDeliveriesPage() {
  const { user } = useAuth();
  const isBackendSession = user?.isBackendSession ?? false;
  const canView = isBackendSession && (user?.role === "owner" || user?.role === "prorab");

  const [page, setPage] = useState(1);
  // GET/POST /material-deliveries is [Authorize(Roles = "Owner,Prorab")] — gated on
  // isBackendSession too so a mock session (no JWT) never fires this even if its mock role string
  // happens to also be "owner"/"prorab".
  const { data, isLoading, isError, error, refetch } = useMaterialDeliveries({ page, pageSize: PAGE_SIZE }, canView);
  const [createOpen, setCreateOpen] = useState(false);
  const createMutation = useCreateMaterialDelivery();

  const columns: DataTableColumn<MaterialDeliveryDto>[] = [
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
          </p>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Поставщик",
      render: (row) => <span className="text-ink-secondary">{row.supplierName || "—"}</span>,
    },
    {
      key: "unitCost",
      header: "Цена за ед.",
      render: (row) => <span className="tabular text-ink">{row.unitCost.toLocaleString("ru-RU")} с.</span>,
    },
    {
      key: "total",
      header: "Сумма",
      render: (row) => <span className="tabular font-semibold text-ink">{(row.unitCost * row.qty).toLocaleString("ru-RU")} с.</span>,
    },
    {
      key: "deliveredAt",
      header: "Дата поставки",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{formatDateShort(row.deliveredAt)}</span>,
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout
      title="Поступления материалов"
      subtitle="Фактические поставки по вашим объектам"
      action={
        canView ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Новая поставка
          </Button>
        ) : undefined
      }
    >
      {!isBackendSession ? (
        <BackendSessionRequired roleHint="Owner или Prorab" />
      ) : !canView ? (
        <Card className="p-5 sm:p-6">
          <p className="text-sm text-ink-secondary">У вашей роли нет доступа к просмотру этого раздела.</p>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список поставок</h2>
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
                title="Не удалось загрузить поставки"
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
              <EmptyState icon={Truck} title="Поставок пока нет" description="Зарегистрируйте первую поставку материалов" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="поставок"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      )}

      {canView && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая поставка материалов">
          <DeliveryForm
            onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
            onCancel={() => setCreateOpen(false)}
            submitting={createMutation.isPending}
          />
        </Modal>
      )}
    </AppLayout>
  );
}

function DeliveryForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (request: {
    objectId: string;
    materialRequestId?: string;
    materialName: string;
    unit: string;
    qty: number;
    unitCost: number;
    supplierName?: string;
  }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [objectId, setObjectId] = useState("");
  const [materialRequestId, setMaterialRequestId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierName, setSupplierName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !objectId.trim() || !materialName.trim() || !unit.trim() || !qty.trim() || !unitCost.trim()) return;
    onSubmit({
      objectId: objectId.trim(),
      materialRequestId: materialRequestId.trim() || undefined,
      materialName: materialName.trim(),
      unit: unit.trim(),
      qty: Number(qty),
      unitCost: Number(unitCost),
      supplierName: supplierName.trim() || undefined,
    });
  }

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="md-object-id">
          ID объекта
        </label>
        <input id="md-object-id" required value={objectId} onChange={(e) => setObjectId(e.target.value)} placeholder="GUID объекта" className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="md-request-id">
          ID заявки (необязательно)
        </label>
        <input id="md-request-id" value={materialRequestId} onChange={(e) => setMaterialRequestId(e.target.value)} placeholder="Если поставка по заявке" className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="md-material">
          Название материала
        </label>
        <input id="md-material" required value={materialName} onChange={(e) => setMaterialName(e.target.value)} className={fieldClass} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="md-unit">
            Ед. изм.
          </label>
          <input id="md-unit" required value={unit} onChange={(e) => setUnit(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="md-qty">
            Количество
          </label>
          <input id="md-qty" type="number" min="0" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="md-unit-cost">
            Цена за ед.
          </label>
          <input id="md-unit-cost" type="number" min="0" step="0.01" required value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="md-supplier">
          Поставщик (необязательно)
        </label>
        <input id="md-supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={fieldClass} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
