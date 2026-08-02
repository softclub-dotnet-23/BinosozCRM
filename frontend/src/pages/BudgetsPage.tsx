import { useEffect, useState } from "react";
import { AlertCircle, Landmark, Loader2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { ApiError, NetworkError } from "../api/apiClient";
import { getObjectBudgets, type ObjectBudgetSummary } from "../api/objectsApi";
import { formatCurrency } from "../utils/format";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

export default function BudgetsPage() {
  const [items, setItems] = useState<ObjectBudgetSummary[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoadState("loading");
    try {
      const result = await getObjectBudgets();
      setItems(result);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить бюджеты"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const columns: DataTableColumn<ObjectBudgetSummary>[] = [
    { key: "objectName", header: "Объект", render: (row) => <span className="font-semibold text-ink">{row.objectName}</span> },
    { key: "budget", header: "Бюджет", render: (row) => <span className="tabular text-ink">{row.budget != null ? formatCurrency(row.budget) : "—"}</span> },
    { key: "actualCost", header: "Факт", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.actualCost)}</span> },
    {
      key: "remaining",
      header: "Остаток",
      render: (row) =>
        row.remaining != null ? (
          <Badge tone={row.remaining < 0 ? "red" : "green"}>{formatCurrency(row.remaining)}</Badge>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
  ];

  return (
    <AppLayout title="Бюджеты" subtitle="Бюджет и фактические расходы по объектам">
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
              <DataTable columns={columns} rows={items} rowKey={(row) => row.objectId} />
            ) : (
              <EmptyState icon={Landmark} title="Объектов пока нет" description="Бюджеты появятся здесь после того, как будут созданы объекты" />
            )}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
