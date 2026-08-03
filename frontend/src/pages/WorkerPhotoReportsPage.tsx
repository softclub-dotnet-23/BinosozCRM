import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Camera, Loader2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PhotoReportModal } from "../components/worker/PhotoReportModal";
import { ApiError, NetworkError } from "../api/apiClient";
import { listMyWorkOrderProgress, listMyWorkOrders, type WorkOrder, type WorkOrderProgress } from "../api/workOrdersApi";
import { listObjectLookups, toNameMap, uniqueIds } from "../api/lookupsApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.code === "WORKER_NOT_FOUND") return "Ваша учётная запись не привязана к рабочему. Обратитесь к администратору.";
    return error.message || fallback;
  }
  return fallback;
}

/**
 * POST /work-orders/{id}/progress is Worker-scoped to their own brigade's
 * work orders (Application/WorkOrders/AddWorkOrderProgressCommand.cs — the
 * same WorkOrderAccess.GetForBrigadirAsync check Brigadir uses, since it
 * only ever checks brigade membership, not the caller's exact role). History
 * comes from GET /work-orders/progress/mine (ListMyWorkOrderProgressQuery,
 * Worker-dashboard checkpoint) — real persisted reports, not a session-only
 * list.
 */
export default function WorkerPhotoReportsPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [reports, setReports] = useState<WorkOrderProgress[]>([]);
  const [workOrderCodeById, setWorkOrderCodeById] = useState<Map<string, string>>(new Map());
  const [objectNameById, setObjectNameById] = useState<Map<string, string>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");

  const [target, setTarget] = useState<WorkOrder | null>(null);

  async function loadAll() {
    setLoadState("loading");
    let orders: WorkOrder[];
    try {
      const [ordersResult, reportsResult] = await Promise.all([
        listMyWorkOrders(1, 100),
        listMyWorkOrderProgress(1, 100),
      ]);
      orders = ordersResult.items;
      setWorkOrders(orders.filter((w) => w.status === "InProgress"));
      setReports(reportsResult.items);
      setWorkOrderCodeById(new Map(orders.map((w) => [w.id, w.code])));
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

    try {
      const ids = uniqueIds(orders.map((w) => w.objectId));
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

  const kpis = useMemo(() => ({
    eligible: workOrders.length,
    total: reports.length,
    photosTotal: reports.reduce((sum, r) => sum + r.photoUrls.length, 0),
  }), [workOrders, reports]);

  const orderColumns: DataTableColumn<WorkOrder>[] = [
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
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => setTarget(row)}><Camera size={14} /> Отчитаться</Button>
        </div>
      ),
    },
  ];

  const reportColumns: DataTableColumn<WorkOrderProgress>[] = [
    { key: "order", header: "Наряд", render: (row) => <span className="font-semibold text-ink">{workOrderCodeById.get(row.workOrderId) ?? "—"}</span> },
    { key: "qty", header: "Объём", render: (row) => <span className="text-ink-secondary">{row.reportedQty}</span> },
    { key: "photos", header: "Фото", render: (row) => <Badge tone="blue">{row.photoUrls.length}</Badge> },
    { key: "comment", header: "Комментарий", render: (row) => <span className="text-ink-secondary">{row.comment ?? "—"}</span> },
    { key: "reportedAt", header: "Время", render: (row) => <span className="text-ink-secondary">{new Date(row.reportedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span> },
  ];

  return (
    <AppLayout title="Фотоотчёты" subtitle="Прогресс по нарядам вашей бригады, в работе">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Доступно нарядов" value={String(kpis.eligible)} icon={Camera} tone="blue" footer="В работе, можно отчитаться" />
        <MetricCard label="Отправлено всего" value={String(kpis.total)} icon={Camera} tone="green" footer="За всё время" />
        <MetricCard label="Фото загружено" value={String(kpis.photosTotal)} icon={Camera} tone="purple" footer="За всё время" />
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
        <>
          <Card className="mt-4">
            <div className="px-5 pt-5 sm:px-6"><h2 className="text-[17px] font-bold text-ink">Наряды в работе</h2></div>
            <div className="mt-4">
              {workOrders.length > 0 ? (
                <DataTable columns={orderColumns} rows={workOrders} rowKey={(row) => row.id} />
              ) : (
                <EmptyState icon={Camera} title="Нет нарядов в работе" description="Отчитаться можно только по наряду в статусе «Выполняется»" />
              )}
            </div>
          </Card>

          <Card className="mt-4">
            <div className="px-5 pt-5 sm:px-6"><h2 className="text-[17px] font-bold text-ink">История отчётов</h2></div>
            <div className="mt-4">
              {reports.length > 0 ? (
                <DataTable columns={reportColumns} rows={reports} rowKey={(row) => row.id} />
              ) : (
                <EmptyState icon={Camera} title="Фотоотчётов пока нет" description="Отчёты о прогрессе появятся здесь после отправки" />
              )}
            </div>
          </Card>
        </>
      )}

      <PhotoReportModal
        workOrder={target}
        onClose={() => setTarget(null)}
        onSuccess={(created) => setReports((current) => [created, ...current])}
      />
    </AppLayout>
  );
}
