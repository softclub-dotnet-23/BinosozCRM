import { useEffect, useState } from "react";
import { AlertCircle, Boxes, Loader2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { ApiError, NetworkError } from "../api/apiClient";
import { getObjectStockBalance, listObjects, type ConstructionObject, type StockBalanceItem } from "../api/objectsApi";
import { formatNumber } from "../utils/format";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

export default function StockPage() {
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [objectsLoadState, setObjectsLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [objectsLoadError, setObjectsLoadError] = useState("");

  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [items, setItems] = useState<StockBalanceItem[]>([]);
  const [balanceLoadState, setBalanceLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [balanceLoadError, setBalanceLoadError] = useState("");

  async function loadObjects() {
    setObjectsLoadState("loading");
    try {
      const result = await listObjects(1, 100);
      setObjects(result.items);
      setObjectsLoadState("ready");
    } catch (error) {
      setObjectsLoadError(describeError(error, "Не удалось загрузить объекты"));
      setObjectsLoadState("error");
    }
  }

  useEffect(() => {
    void loadObjects();
  }, []);

  async function loadBalance(objectId: string) {
    setBalanceLoadState("loading");
    try {
      const result = await getObjectStockBalance(objectId);
      setItems(result);
      setBalanceLoadState("ready");
    } catch (error) {
      setBalanceLoadError(describeError(error, "Не удалось загрузить остатки"));
      setBalanceLoadState("error");
    }
  }

  useEffect(() => {
    if (selectedObjectId) void loadBalance(selectedObjectId);
  }, [selectedObjectId]);

  const columns: DataTableColumn<StockBalanceItem>[] = [
    { key: "materialName", header: "Наименование", width: "34%", render: (row) => <span className="font-medium text-ink">{row.materialName}</span> },
    { key: "unit", header: "Ед. изм.", width: "14%", render: (row) => <span className="text-ink-secondary">{row.unit}</span> },
    { key: "delivered", header: "Приход", width: "17%", render: (row) => <span className="tabular text-ink-secondary">{formatNumber(row.totalDelivered)}</span> },
    { key: "consumed", header: "Расход", width: "17%", render: (row) => <span className="tabular text-ink-secondary">{formatNumber(row.totalConsumed)}</span> },
    { key: "balance", header: "Остаток", width: "18%", render: (row) => <span className="tabular font-semibold text-ink">{formatNumber(row.balance)}</span> },
  ];

  return (
    <AppLayout title="Остатки" subtitle="Остатки материалов по объекту">
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <h2 className="text-[17px] font-bold text-ink">Объект</h2>
          <div className="w-full max-w-xs">
            {objectsLoadState === "ready" && (
              <CustomSelect
                fullWidth
                value={selectedObjectId}
                onValueChange={setSelectedObjectId}
                placeholder="Выберите объект"
                options={objects.map((o) => ({ value: o.id, label: o.name }))}
              />
            )}
          </div>
        </div>

        {objectsLoadState === "error" && (
          <div className="px-5 pb-5 pt-4 sm:px-6">
            <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{objectsLoadError}</span></div>
            <Button size="sm" variant="secondary" onClick={() => void loadObjects()} style={{ marginTop: 12 }}>Повторить</Button>
          </div>
        )}

        {objectsLoadState === "loading" && (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>
        )}

        {objectsLoadState === "ready" && !selectedObjectId && (
          <EmptyState icon={Boxes} title="Выберите объект, чтобы увидеть остатки" description="Остатки считаются по каждому объекту отдельно — общего списка по всем объектам нет." />
        )}

        {objectsLoadState === "ready" && selectedObjectId && balanceLoadState === "loading" && (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>
        )}

        {objectsLoadState === "ready" && selectedObjectId && balanceLoadState === "error" && (
          <div className="px-5 pb-5 pt-4 sm:px-6">
            <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{balanceLoadError}</span></div>
            <Button size="sm" variant="secondary" onClick={() => void loadBalance(selectedObjectId)} style={{ marginTop: 12 }}>Повторить</Button>
          </div>
        )}

        {objectsLoadState === "ready" && selectedObjectId && balanceLoadState === "ready" && (
          <div className="mt-4">
            {items.length > 0 ? (
              <DataTable columns={columns} rows={items} rowKey={(row) => `${row.materialName}__${row.unit}`} />
            ) : (
              <EmptyState icon={Boxes} title="Остатков пока нет" description="По этому объекту ещё нет поступлений или расхода материалов" />
            )}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
