import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, PackageCheck } from "lucide-react";
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
import BrigadirMaterialsPage from "./BrigadirMaterialsPage";
import { ApiError, NetworkError } from "../api/apiClient";
import {
  approveMaterialRequest,
  forceCloseMaterialRequest,
  listMaterialRequests,
  markMaterialRequestOrdered,
  rejectMaterialRequest,
  type MaterialRequest,
  type MaterialRequestStatus,
} from "../api/materialRequestsApi";
import { listObjects, type ConstructionObject } from "../api/objectsApi";
import { listBrigades, type Brigade } from "../api/brigadesApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const STATUS_LABEL: Record<MaterialRequestStatus, string> = {
  Requested: "Запрошено", Approved: "Одобрено", Ordered: "Заказано", PartiallyDelivered: "Частично доставлено", Delivered: "Доставлено", Rejected: "Отклонено",
};
const STATUS_TONE: Record<MaterialRequestStatus, "blue" | "green" | "orange" | "purple" | "red"> = {
  Requested: "blue", Approved: "orange", Ordered: "purple", PartiallyDelivered: "orange", Delivered: "green", Rejected: "red",
};

/** Create is Brigadir-only (Telegram bot) — this page only reads and acts on requests already raised there. */
export default function MaterialRequestsPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirMaterialsPage />;
  const { showToast } = useToast();

  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MaterialRequestStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [forceCloseTarget, setForceCloseTarget] = useState<MaterialRequest | null>(null);
  const [forceCloseComment, setForceCloseComment] = useState("");
  const [forceCloseError, setForceCloseError] = useState("");
  const [forceClosing, setForceClosing] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [requestsResult, objectsResult, brigadesResult] = await Promise.all([
        listMaterialRequests(1, 100),
        listObjects(1, 100),
        listBrigades(1, 100),
      ]);
      setRequests(requestsResult.items);
      setObjects(objectsResult.items);
      setBrigades(brigadesResult.items);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить заявки"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const objectNameById = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);
  const brigadeNameById = useMemo(() => new Map(brigades.map((b) => [b.id, b.name])), [brigades]);

  const filteredRequests = useMemo(
    () => (statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter)),
    [requests, statusFilter],
  );

  const kpis = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "Requested").length,
    overDelivered: requests.filter((r) => r.isOverDelivered).length,
  }), [requests]);

  async function runAction(request: MaterialRequest, action: (id: string) => Promise<MaterialRequest>, successMessage: string) {
    if (busyId) return;
    setBusyId(request.id);
    try {
      const updated = await action(request.id);
      setRequests((current) => current.map((r) => (r.id === updated.id ? updated : r)));
      showToast(successMessage);
    } catch (error) {
      showToast(describeError(error, "Не удалось выполнить действие"), "error");
    } finally {
      setBusyId(null);
    }
  }

  function openForceClose(request: MaterialRequest) {
    setForceCloseTarget(request);
    setForceCloseComment("");
    setForceCloseError("");
  }

  async function submitForceClose(event: FormEvent) {
    event.preventDefault();
    if (!forceCloseTarget || forceClosing) return;
    if (!forceCloseComment.trim()) {
      setForceCloseError("Комментарий обязателен при принудительном закрытии");
      return;
    }
    setForceClosing(true);
    setForceCloseError("");
    try {
      const updated = await forceCloseMaterialRequest(forceCloseTarget.id, forceCloseComment.trim());
      setRequests((current) => current.map((r) => (r.id === updated.id ? updated : r)));
      setForceCloseTarget(null);
      showToast("Заявка закрыта");
    } catch (error) {
      setForceCloseError(describeError(error, "Не удалось закрыть заявку"));
    } finally {
      setForceClosing(false);
    }
  }

  const columns: DataTableColumn<MaterialRequest>[] = [
    { key: "material", header: "Материал", render: (row) => <span className="font-semibold text-ink">{row.materialName}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectNameById.get(row.objectId) ?? "—"}</span> },
    { key: "brigade", header: "Бригада", render: (row) => <span className="text-ink-secondary">{brigadeNameById.get(row.brigadeId) ?? "—"}</span> },
    { key: "qty", header: "Кол-во", render: (row) => <span className="text-ink-secondary">{row.qty} {row.unit}{row.qtyDelivered > 0 ? ` (доставлено ${row.qtyDelivered})` : ""}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {row.status === "Requested" && (
            <>
              <Button size="sm" disabled={busyId === row.id} onClick={() => void runAction(row, approveMaterialRequest, "Заявка одобрена")}>Одобрить</Button>
              <Button size="sm" variant="danger" disabled={busyId === row.id} onClick={() => void runAction(row, rejectMaterialRequest, "Заявка отклонена")}>Отклонить</Button>
            </>
          )}
          {row.status === "Approved" && <Button size="sm" disabled={busyId === row.id} onClick={() => void runAction(row, markMaterialRequestOrdered, "Отмечено как заказано")}>Заказано</Button>}
          {(row.status === "PartiallyDelivered" || row.status === "Ordered") && (
            <Button size="sm" variant="secondary" disabled={busyId === row.id} onClick={() => openForceClose(row)}>Закрыть принудительно</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Заявки на материалы" subtitle="Заявки бригад на материалы, ожидающие решения">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего заявок" value={String(kpis.total)} icon={PackageCheck} tone="orange" footer="За всё время" />
        <MetricCard label="Ожидают решения" value={String(kpis.pending)} icon={PackageCheck} tone="blue" footer="Новые заявки" />
        <MetricCard label="Перепоставки" value={String(kpis.overDelivered)} icon={AlertCircle} tone="red" footer="Доставлено больше запрошенного" />
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
            <h2 className="text-[17px] font-bold text-ink">Заявки</h2>
            <CustomSelect
              size="sm"
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[{ value: "all", label: "Все статусы" }, ...(Object.keys(STATUS_LABEL) as MaterialRequestStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
            />
          </div>
          <div className="mt-4">
            {filteredRequests.length > 0 ? (
              <DataTable columns={columns} rows={filteredRequests} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={PackageCheck} title="Заявок не найдено" description="Заявки появятся здесь после того, как бригадир запросит материалы" />
            )}
          </div>
        </Card>
      )}

      <Modal open={forceCloseTarget !== null} onClose={() => setForceCloseTarget(null)} title="Закрыть заявку принудительно" description={forceCloseTarget?.materialName} size="sm">
        <form className="users-modal-form" onSubmit={submitForceClose}>
          <label><span>Комментарий (обязательно)</span><input value={forceCloseComment} onChange={(e) => setForceCloseComment(e.target.value)} autoFocus /></label>
          {forceCloseError && <p className="users-modal-error" role="alert">{forceCloseError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setForceCloseTarget(null)}>Отмена</Button>
            <Button type="submit" disabled={forceClosing}>{forceClosing ? "Сохранение..." : "Закрыть"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
