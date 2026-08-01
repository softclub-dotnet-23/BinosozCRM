import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Info, Loader2, PackageMinus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ApiError, NetworkError } from "../api/apiClient";
import { listMaterialConsumptionReports, type MaterialConsumptionReport } from "../api/materialConsumptionApi";
import { listBrigades, type Brigade } from "../api/brigadesApi";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/**
 * Read-only for Owner/Prorab: MaterialConsumptionReportsController gates
 * POST to Brigadir only (MASTER §12's role matrix — Owner/Prorab are R-only)
 * and Brigadir works through the Telegram bot (MASTER §0), not this web
 * panel. There is no "create a write-off" action for this page to offer.
 */
export default function WriteOffsPage() {
  const [reports, setReports] = useState<MaterialConsumptionReport[]>([]);
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  async function loadAll() {
    setLoadState("loading");
    try {
      const [reportsResult, brigadesResult] = await Promise.all([
        listMaterialConsumptionReports(1, 100),
        listBrigades(1, 100),
      ]);
      setReports(reportsResult.items);
      setBrigades(brigadesResult.items);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить списания"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const brigadeNameById = useMemo(() => new Map(brigades.map((b) => [b.id, b.name])), [brigades]);

  const kpis = useMemo(() => ({
    total: reports.length,
    withShortage: reports.filter((r) => r.qtyShortage > 0).length,
  }), [reports]);

  const columns: DataTableColumn<MaterialConsumptionReport>[] = [
    { key: "date", header: "Дата", render: (row) => <span className="text-ink-secondary">{row.date}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{row.objectName}</span> },
    { key: "brigade", header: "Бригада", render: (row) => <span className="text-ink-secondary">{brigadeNameById.get(row.brigadeId) ?? "—"}</span> },
    { key: "material", header: "Материал", render: (row) => <span className="font-semibold text-ink">{row.materialName}</span> },
    { key: "qtyUsed", header: "Списано", render: (row) => <span className="text-ink-secondary">{row.qtyUsed} {row.unit}</span> },
    { key: "shortage", header: "Нехватка", render: (row) => (row.qtyShortage > 0 ? <Badge tone="red">{row.qtyShortage} {row.unit}</Badge> : <span className="text-ink-muted">—</span>) },
    { key: "comment", header: "Комментарий", render: (row) => <span className="text-ink-secondary">{row.comment ?? "—"}</span> },
  ];

  return (
    <AppLayout title="Списания материалов" subtitle="Ежедневные отчёты о расходе материалов бригадами">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Всего отчётов" value={String(kpis.total)} icon={PackageMinus} tone="orange" footer="За всё время" />
        <MetricCard label="С нехваткой" value={String(kpis.withShortage)} icon={AlertCircle} tone="red" footer="Отчётов с недостачей" />
      </div>

      <Card style={{ marginTop: 16, padding: 16 }}>
        <div className="flex items-start gap-2 text-sm text-ink-secondary">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>Списания создаёт бригадир через Telegram-бот при закрытии смены. На этой странице — только просмотр.</span>
        </div>
      </Card>

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
          <div className="mt-4">
            {reports.length > 0 ? (
              <DataTable columns={columns} rows={reports} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={PackageMinus} title="Списаний пока нет" description="Отчёты появятся здесь после того, как бригадир отчитается о расходе материалов" />
            )}
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
