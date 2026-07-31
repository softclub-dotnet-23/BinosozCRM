import { useState, type FormEvent } from "react";
import { AlertCircle, ClipboardList, Plus } from "lucide-react";
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
import { useMaterialConsumptionReports, useReportMaterialConsumption } from "../hooks/api/useMaterialConsumptionReports";
import { normalizeApiError } from "../services/apiError";
import type { MaterialConsumptionReportDto } from "../services/materialConsumptionReportsApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

/**
 * Dedicated page for MaterialConsumptionReportsController (api/v1/material-consumption-reports).
 * Conceptually close to "Списания" (WriteOffsPage.tsx) but structurally different: the mock model
 * groups several materials under one write-off document with a `reason` enum the backend has no
 * equivalent for; this DTO is one material per report with a `qtyShortage` field the mock lacks
 * entirely. Kept separate rather than forcing either model into the other.
 */
export default function MaterialConsumptionReportsPage() {
  const { user } = useAuth();
  const isBackendSession = user?.isBackendSession ?? false;
  const isBrigadir = isBackendSession && user?.role === "brigadir";
  const canView = isBackendSession && (user?.role === "owner" || user?.role === "prorab");

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useMaterialConsumptionReports({ page, pageSize: PAGE_SIZE }, canView);

  const [createOpen, setCreateOpen] = useState(false);
  const reportMutation = useReportMaterialConsumption();

  const columns: DataTableColumn<MaterialConsumptionReportDto>[] = [
    {
      key: "date",
      header: "Дата",
      sticky: "left",
      width: "100px",
      render: (row) => <span className="whitespace-nowrap font-medium text-ink">{formatDateShort(row.date)}</span>,
    },
    {
      key: "material",
      header: "Материал",
      render: (row) => <span className="font-semibold text-ink">{row.materialName}</span>,
    },
    {
      key: "used",
      header: "Использовано",
      render: (row) => (
        <span className="tabular text-ink">
          {row.qtyUsed} {row.unit}
        </span>
      ),
    },
    {
      key: "shortage",
      header: "Нехватка",
      render: (row) => (
        <span className={`tabular ${row.qtyShortage > 0 ? "font-semibold text-red" : "text-ink-muted"}`}>
          {row.qtyShortage > 0 ? `${row.qtyShortage} ${row.unit}` : "—"}
        </span>
      ),
    },
    {
      key: "comment",
      header: "Комментарий",
      render: (row) => <span className="text-ink-secondary">{row.comment || "—"}</span>,
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout
      title="Отчёты о расходе материалов"
      subtitle={isBrigadir ? "Отчёты вашей бригады" : "Отчёты по вашим объектам"}
      action={
        isBrigadir ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Новый отчёт
          </Button>
        ) : undefined
      }
    >
      {!isBackendSession ? (
        <BackendSessionRequired roleHint="Owner или Prorab" />
      ) : canView ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список отчётов</h2>
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
                title="Не удалось загрузить отчёты"
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
              <EmptyState icon={ClipboardList} title="Отчётов пока нет" description="Отчёты появятся после создания бригадиром" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="отчётов"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <p className="text-sm text-ink-secondary">
            Backend не предоставляет вашей роли список отчётов (GET /material-consumption-reports доступен только
            Owner/Prorab) — используйте кнопку «Новый отчёт», чтобы отправить отчёт по вашей бригаде.
          </p>
        </Card>
      )}

      {isBrigadir && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый отчёт о расходе материалов">
          <ConsumptionReportForm
            onSubmit={(request) => reportMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
            onCancel={() => setCreateOpen(false)}
            submitting={reportMutation.isPending}
          />
        </Modal>
      )}
    </AppLayout>
  );
}

function ConsumptionReportForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (request: { objectId: string; date: string; materialName: string; unit: string; qtyUsed: number; qtyShortage: number; comment?: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [objectId, setObjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [materialName, setMaterialName] = useState("");
  const [unit, setUnit] = useState("");
  const [qtyUsed, setQtyUsed] = useState("");
  const [qtyShortage, setQtyShortage] = useState("0");
  const [comment, setComment] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !objectId.trim() || !materialName.trim() || !unit.trim() || !qtyUsed.trim()) return;
    onSubmit({
      objectId: objectId.trim(),
      date,
      materialName: materialName.trim(),
      unit: unit.trim(),
      qtyUsed: Number(qtyUsed),
      qtyShortage: Number(qtyShortage || 0),
      comment: comment.trim() || undefined,
    });
  }

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="cr-object-id">
          ID объекта
        </label>
        <input id="cr-object-id" required value={objectId} onChange={(e) => setObjectId(e.target.value)} placeholder="GUID объекта" className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="cr-date">
          Дата
        </label>
        <input id="cr-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="cr-material">
          Название материала
        </label>
        <input id="cr-material" required value={materialName} onChange={(e) => setMaterialName(e.target.value)} className={fieldClass} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="cr-unit">
            Ед. изм.
          </label>
          <input id="cr-unit" required value={unit} onChange={(e) => setUnit(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="cr-used">
            Использовано
          </label>
          <input id="cr-used" type="number" min="0" step="0.01" required value={qtyUsed} onChange={(e) => setQtyUsed(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="cr-shortage">
            Нехватка
          </label>
          <input id="cr-shortage" type="number" min="0" step="0.01" value={qtyShortage} onChange={(e) => setQtyShortage(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="cr-comment">
          Комментарий (необязательно)
        </label>
        <textarea id="cr-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Отправка..." : "Отправить отчёт"}
        </Button>
      </div>
    </form>
  );
}
