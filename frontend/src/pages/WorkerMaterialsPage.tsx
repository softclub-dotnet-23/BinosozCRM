import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Package, Plus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { MaterialRequestModal } from "../components/worker/MaterialRequestModal";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import { getObjectStockBalance, type StockBalanceItem } from "../api/objectsApi";
import { listMaterialRequests, type MaterialRequest, type MaterialRequestStatus } from "../api/materialRequestsApi";
import { listObjectLookups, type LookupItem } from "../api/lookupsApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Сессия истекла. Войдите в систему заново.";
    if (error.code === "WORKER_NOT_FOUND") return "Ваша учётная запись не привязана к рабочему. Обратитесь к администратору.";
    return error.message || fallback;
  }
  return fallback;
}

const STATUS_LABEL: Record<MaterialRequestStatus, string> = {
  Requested: "Запрошено",
  Approved: "Одобрено",
  Ordered: "Заказано",
  PartiallyDelivered: "Доставлено частично",
  Delivered: "Доставлено",
  Rejected: "Отклонено",
};
const STATUS_TONE: Record<MaterialRequestStatus, "blue" | "orange" | "green" | "red" | "purple"> = {
  Requested: "blue",
  Approved: "purple",
  Ordered: "orange",
  PartiallyDelivered: "orange",
  Delivered: "green",
  Rejected: "red",
};

/**
 * GET /objects/{id}/stock is Worker-scoped to their own brigade's objects
 * (Application/Materials/GetStockBalanceQuery.cs, Worker-role checkpoint).
 * GET,POST /material-requests are Worker-scoped to their own requests
 * (RequestedByUserId == self) — see ListMaterialRequestsQuery/
 * CreateMaterialRequestCommand's own comments.
 */
export default function WorkerMaterialsPage() {
  const { showToast } = useToast();

  const [tab, setTab] = useState<"stock" | "requests">("stock");
  const [objects, setObjects] = useState<LookupItem[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [stock, setStock] = useState<StockBalanceItem[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "unavailable">("loading");
  const [loadError, setLoadError] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [objectsResult, requestsResult] = await Promise.all([
        listObjectLookups({ limit: 100 }),
        listMaterialRequests(1, 100),
      ]);
      setObjects(objectsResult);
      setSelectedObjectId(objectsResult[0]?.id ?? "");
      setRequests(requestsResult.items);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.code === "WORKER_NOT_FOUND") {
        setLoadState("unavailable");
        return;
      }
      setLoadError(describeError(error, "Не удалось загрузить материалы"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!selectedObjectId) return;
    setStockLoading(true);
    getObjectStockBalance(selectedObjectId)
      .then(setStock)
      .catch((error) => showToast(describeError(error, "Не удалось загрузить остатки"), "error"))
      .finally(() => setStockLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObjectId]);

  const kpis = useMemo(() => ({
    totalRequests: requests.length,
    pending: requests.filter((r) => r.status === "Requested" || r.status === "Approved" || r.status === "Ordered").length,
    delivered: requests.filter((r) => r.status === "Delivered").length,
  }), [requests]);

  const stockColumns: DataTableColumn<StockBalanceItem>[] = [
    { key: "material", header: "Материал", render: (row) => <span className="font-semibold text-ink">{row.materialName}</span> },
    { key: "unit", header: "Ед. изм.", render: (row) => <span className="text-ink-secondary">{row.unit}</span> },
    { key: "delivered", header: "Поставлено", render: (row) => <span className="text-ink-secondary">{row.totalDelivered}</span> },
    { key: "consumed", header: "Израсходовано", render: (row) => <span className="text-ink-secondary">{row.totalConsumed}</span> },
    { key: "balance", header: "Остаток", render: (row) => <Badge tone={row.balance > 0 ? "green" : "red"}>{row.balance}</Badge> },
  ];

  const requestColumns: DataTableColumn<MaterialRequest>[] = [
    { key: "material", header: "Материал", render: (row) => <span className="font-semibold text-ink">{row.materialName}</span> },
    { key: "qty", header: "Количество", render: (row) => <span className="text-ink-secondary">{row.qty} {row.unit}</span> },
    { key: "delivered", header: "Доставлено", render: (row) => <span className="text-ink-secondary">{row.qtyDelivered} {row.unit}</span> },
    { key: "requestedAt", header: "Дата", render: (row) => <span className="text-ink-secondary">{new Date(row.requestedAt).toLocaleDateString("ru-RU")}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
  ];

  return (
    <AppLayout
      title="Материалы"
      subtitle="Остатки на объекте и ваши заявки"
      action={tab === "requests" ? <Button onClick={() => setCreateOpen(true)} disabled={!selectedObjectId}><Plus size={15} /> Новая заявка</Button> : undefined}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Всего заявок" value={String(kpis.totalRequests)} icon={Package} tone="blue" footer="За всё время" />
        <MetricCard label="В ожидании" value={String(kpis.pending)} icon={Package} tone="orange" footer="Запрошено / одобрено / заказано" />
        <MetricCard label="Доставлено" value={String(kpis.delivered)} icon={Package} tone="green" footer="Полностью выполненные заявки" />
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
        <Card className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <div className="flex gap-2">
              <Button size="sm" variant={tab === "stock" ? "primary" : "secondary"} onClick={() => setTab("stock")}>Остатки</Button>
              <Button size="sm" variant={tab === "requests" ? "primary" : "secondary"} onClick={() => setTab("requests")}>Мои заявки</Button>
            </div>
            {tab === "stock" && objects.length > 1 && (
              <CustomSelect size="sm" value={selectedObjectId} onValueChange={setSelectedObjectId} options={objects.map((o) => ({ value: o.id, label: o.name }))} />
            )}
          </div>

          <div className="mt-4">
            {tab === "stock" ? (
              stockLoading ? (
                <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={20} className="animate-spin" style={{ margin: "0 auto" }} /></div>
              ) : stock.length > 0 ? (
                <DataTable columns={stockColumns} rows={stock} rowKey={(row) => `${row.materialName}-${row.unit}`} />
              ) : (
                <EmptyState icon={Package} title="Нет данных по остаткам" description="На этом объекте пока нет поставок или расхода материалов" />
              )
            ) : requests.length > 0 ? (
              <DataTable columns={requestColumns} rows={requests} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={Package} title="Заявок пока нет" description="Создайте заявку на материал, если он заканчивается" />
            )}
          </div>
        </Card>
      )}

      <MaterialRequestModal
        open={createOpen}
        objectId={selectedObjectId}
        onClose={() => setCreateOpen(false)}
        onSuccess={(created) => {
          setRequests((current) => [created, ...current]);
          showToast("Заявка отправлена");
        }}
      />
    </AppLayout>
  );
}
