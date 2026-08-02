import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Camera, Loader2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Modal } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import { addWorkOrderProgress, listMyWorkOrders, type WorkOrder, type WorkOrderProgress } from "../api/workOrdersApi";
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
 * only ever checks brigade membership, not the caller's exact role). The
 * backend has no endpoint to *list* past progress reports, so the feed
 * below is this browser session's own submissions only — labeled as such,
 * not presented as history.
 */
export default function WorkerPhotoReportsPage() {
  const { showToast } = useToast();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [objectNameById, setObjectNameById] = useState<Map<string, string>>(new Map());
  const [sessionReports, setSessionReports] = useState<(WorkOrderProgress & { workOrderCode: string })[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");

  const [target, setTarget] = useState<WorkOrder | null>(null);
  const [qty, setQty] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    let items: WorkOrder[];
    try {
      const result = await listMyWorkOrders(1, 100);
      items = result.items.filter((w) => w.status === "InProgress");
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

    try {
      const ids = uniqueIds(items.map((w) => w.objectId));
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
    submittedThisSession: sessionReports.length,
    photosThisSession: sessionReports.reduce((sum, r) => sum + r.photoUrls.length, 0),
  }), [workOrders, sessionReports]);

  function openForm(order: WorkOrder) {
    setTarget(order);
    setQty("");
    setComment("");
    setPhotos([]);
    setFormError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target || submitting) return;
    const reportedQty = Number(qty);
    if (!qty || reportedQty <= 0) {
      setFormError("Укажите выполненный объём больше нуля");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const created = await addWorkOrderProgress(target.id, {
        reportedQty,
        comment: comment.trim() || undefined,
        photos,
      });
      setSessionReports((current) => [{ ...created, workOrderCode: target.code }, ...current]);
      setTarget(null);
      showToast("Фотоотчёт отправлен");
    } catch (error) {
      setFormError(describeError(error, "Не удалось отправить фотоотчёт"));
    } finally {
      setSubmitting(false);
    }
  }

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
          <Button size="sm" onClick={() => openForm(row)}><Camera size={14} /> Отчитаться</Button>
        </div>
      ),
    },
  ];

  const reportColumns: DataTableColumn<WorkOrderProgress & { workOrderCode: string }>[] = [
    { key: "order", header: "Наряд", render: (row) => <span className="font-semibold text-ink">{row.workOrderCode}</span> },
    { key: "qty", header: "Объём", render: (row) => <span className="text-ink-secondary">{row.reportedQty}</span> },
    { key: "photos", header: "Фото", render: (row) => <Badge tone="blue">{row.photoUrls.length}</Badge> },
    { key: "comment", header: "Комментарий", render: (row) => <span className="text-ink-secondary">{row.comment ?? "—"}</span> },
    { key: "reportedAt", header: "Время", render: (row) => <span className="text-ink-secondary">{new Date(row.reportedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span> },
  ];

  return (
    <AppLayout title="Фотоотчёты" subtitle="Прогресс по нарядам вашей бригады, в работе">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Доступно нарядов" value={String(kpis.eligible)} icon={Camera} tone="blue" footer="В работе, можно отчитаться" />
        <MetricCard label="Отправлено сейчас" value={String(kpis.submittedThisSession)} icon={Camera} tone="green" footer="За эту сессию" />
        <MetricCard label="Фото загружено" value={String(kpis.photosThisSession)} icon={Camera} tone="purple" footer="За эту сессию" />
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
            <div className="px-5 pt-5 sm:px-6"><h2 className="text-[17px] font-bold text-ink">Отправлено за эту сессию</h2></div>
            <div className="mt-4">
              {sessionReports.length > 0 ? (
                <DataTable columns={reportColumns} rows={sessionReports} rowKey={(row) => row.id} />
              ) : (
                <EmptyState icon={Camera} title="Пока ничего не отправлено" description="Отчёты, отправленные в этой сессии, появятся здесь" />
              )}
            </div>
          </Card>
        </>
      )}

      <Modal open={target !== null} onClose={() => setTarget(null)} title="Отчитаться о прогрессе" description={target?.code} size="sm">
        <form className="users-modal-form" onSubmit={(e) => void submit(e)}>
          <label><span>Выполненный объём</span><input type="number" min="0" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></label>
          <label><span>Комментарий</span><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательно" /></label>
          <label><span>Фото</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} /></label>
          {formError && <p className="users-modal-error" role="alert">{formError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Отправка..." : "Отправить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
