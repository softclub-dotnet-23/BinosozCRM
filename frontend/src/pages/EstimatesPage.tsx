import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Building2, Calculator, FileText, Plus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CustomSelect } from "../components/ui/CustomSelect";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useObjects, useEstimateItems, useCreateEstimateItem } from "../hooks/api/useObjects";
import { normalizeApiError } from "../services/apiError";
import { formatCurrency } from "../utils/format";
import type { EstimateItemDto } from "../services/objectsApi";

export default function EstimatesPage() {
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: objectsData, isLoading: objectsLoading } = useObjects({ page: 1, pageSize: 200 });
  const objects = objectsData?.items ?? [];
  const activeObjectId = selectedObjectId || objects[0]?.id || "";

  const { data, isLoading, isError, error, refetch } = useEstimateItems(activeObjectId, { page: 1, pageSize: 200 });
  const createMutation = useCreateEstimateItem();

  const items = data?.items ?? [];
  const kpis = useMemo(() => {
    const totalPlanned = items.reduce((sum, i) => sum + i.plannedQty * i.plannedUnitPrice, 0);
    const stages = new Set(items.map((i) => i.stage).filter(Boolean)).size;
    return { totalItems: items.length, totalPlanned, stages };
  }, [items]);

  const columns: DataTableColumn<EstimateItemDto>[] = [
    { key: "workType", header: "Вид работ", sticky: "left", width: "220px", render: (row) => <span className="font-semibold text-ink">{row.workType}</span> },
    { key: "stage", header: "Этап", render: (row) => <span className="text-ink-secondary">{row.stage ?? "—"}</span> },
    { key: "unit", header: "Ед. изм.", render: (row) => <span className="text-ink-secondary">{row.unit}</span> },
    { key: "plannedQty", header: "План. кол-во", render: (row) => <span className="tabular text-ink">{row.plannedQty}</span> },
    { key: "unitPrice", header: "Цена за ед.", render: (row) => <span className="tabular text-ink">{formatCurrency(row.plannedUnitPrice)}</span> },
    { key: "total", header: "Сумма", render: (row) => <span className="tabular font-semibold text-ink">{formatCurrency(row.plannedQty * row.plannedUnitPrice)}</span> },
  ];

  return (
    <AppLayout title="Сметы" subtitle="Сметные позиции по объектам">
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <CustomSelect
          size="sm"
          value={activeObjectId}
          onValueChange={setSelectedObjectId}
          placeholder="Выберите объект"
          options={objects.map((o) => ({ value: o.id, label: o.name }))}
        />
        <Button className="ml-auto" onClick={() => setAddOpen(true)} disabled={!activeObjectId}><Plus size={15} /> Позиция сметы</Button>
      </Card>

      {!objectsLoading && objects.length === 0 ? (
        <EmptyState icon={Building2} title="Объектов пока нет" description="Создайте объект на странице «Объекты»" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Позиций сметы" value={String(kpis.totalItems)} icon={FileText} tone="blue" />
            <MetricCard label="Плановая сумма" value={formatCurrency(kpis.totalPlanned)} icon={Calculator} tone="green" />
            <MetricCard label="Этапов" value={String(kpis.stages)} icon={Building2} tone="purple" />
          </div>

          <Card>
            {isLoading ? (
              <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}</div>
            ) : isError ? (
              <EmptyState icon={AlertTriangle} title="Не удалось загрузить смету" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
            ) : items.length === 0 ? (
              <EmptyState icon={FileText} title="Смета пуста" description="Добавьте первую позицию" />
            ) : (
              <DataTable columns={columns} rows={items} rowKey={(row) => row.id} />
            )}
          </Card>
        </>
      )}

      <AddEstimateItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        submitting={createMutation.isPending}
        onSubmit={(request) => createMutation.mutate({ objectId: activeObjectId, request }, { onSuccess: () => setAddOpen(false) })}
      />
    </AppLayout>
  );
}

function AddEstimateItemModal({
  open,
  onClose,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (request: { workType: string; unit: string; plannedQty: number; plannedUnitPrice: number; stage?: string | null }) => void;
}) {
  const [workType, setWorkType] = useState("");
  const [unit, setUnit] = useState("");
  const [plannedQty, setPlannedQty] = useState("");
  const [plannedUnitPrice, setPlannedUnitPrice] = useState("");
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  function reset() { setWorkType(""); setUnit(""); setPlannedQty(""); setPlannedUnitPrice(""); setStage(""); setError(""); }
  function handleClose() { reset(); onClose(); }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const qty = Number(plannedQty);
    const price = Number(plannedUnitPrice);
    if (!workType.trim() || !unit.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
      return setError("Заполните обязательные поля корректными значениями");
    }
    onSubmit({ workType: workType.trim(), unit: unit.trim(), plannedQty: qty, plannedUnitPrice: price, stage: stage.trim() || null });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Новая позиция сметы" size="md">
      <form className="users-modal-form" onSubmit={handleSubmit}>
        <label><span>Вид работ</span><input value={workType} onChange={(e) => setWorkType(e.target.value)} placeholder="Заливка фундамента" /></label>
        <label><span>Этап</span><input value={stage} onChange={(e) => setStage(e.target.value)} /></label>
        <label><span>Единица измерения</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="м³" /></label>
        <label><span>Плановое количество</span><input type="number" min="0" step="0.01" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} /></label>
        <label><span>Цена за единицу</span><input type="number" min="0" step="0.01" value={plannedUnitPrice} onChange={(e) => setPlannedUnitPrice(e.target.value)} /></label>
        {error && <p className="users-modal-error" role="alert">{error}</p>}
        <div className="users-modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>Отмена</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Добавление..." : "Добавить"}</Button>
        </div>
      </form>
    </Modal>
  );
}
