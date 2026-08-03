import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Package } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { useAuth } from "../context/AuthContext";
import { ApiError, NetworkError } from "../api/apiClient";
import { listMaterialCatalog, type MaterialCatalogEntry } from "../api/materialDeliveriesApi";
import { formatCurrency } from "../utils/format";
import WorkerMaterialsPage from "./WorkerMaterialsPage";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

export default function MaterialsPage() {
  const { user } = useAuth();
  if (user?.role === "worker") return <WorkerMaterialsPage />;
  return <CompanyMaterialsPage />;
}

function CompanyMaterialsPage() {
  const [items, setItems] = useState<MaterialCatalogEntry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoadState("loading");
    try {
      const result = await listMaterialCatalog();
      setItems(result);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить материалы"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const columns: DataTableColumn<MaterialCatalogEntry>[] = [
    { key: "materialName", header: "Наименование", render: (row) => <span className="font-semibold text-ink">{row.materialName}</span> },
    { key: "unit", header: "Ед. изм.", render: (row) => <span className="text-ink-secondary">{row.unit}</span> },
    { key: "lastUnitCost", header: "Последняя цена", render: (row) => <span className="tabular text-ink">{formatCurrency(row.lastUnitCost)}</span> },
    { key: "deliveryCount", header: "Кол-во поставок", render: (row) => <span className="tabular text-ink-secondary">{row.deliveryCount}</span> },
  ];

  return (
    <AppLayout title="Материалы" subtitle="Материалы, встречавшиеся в поступлениях">
      <Card className="mt-4">
        {loadState === "error" && (
          <div className="px-5 pb-5 pt-5 sm:px-6">
            <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
            <Button size="sm" variant="secondary" onClick={() => void load()} style={{ marginTop: 12 }}>Повторить</Button>
          </div>
        )}

        {loadState === "loading" && (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>
        )}

        {loadState === "ready" && (
          <div className="pt-2">
            {items.length > 0 ? (
              <DataTable columns={columns} rows={items} rowKey={(row) => `${row.materialName}__${row.unit}`} />
            ) : (
              <EmptyState icon={Package} title="Материалов пока нет" description="Список появится здесь после первого поступления материалов" />
            )}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
