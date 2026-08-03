import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { CustomSelect } from "../components/ui/CustomSelect";
import { useToast } from "../hooks/useToast";
import { ApiError, NetworkError } from "../api/apiClient";
import { createMaterialDeliveryDocument, groupByDocument, listMaterialDeliveries, type MaterialDeliveryDocument, type MaterialDeliveryDocumentLine } from "../api/materialDeliveriesApi";
import { listObjects, type ConstructionObject } from "../api/objectsApi";
import { formatCurrency } from "../utils/format";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const EMPTY_LINE: MaterialDeliveryDocumentLine = { materialName: "", unit: "", qty: 0, unitCost: 0 };

export default function ReceiptsPage() {
  const { showToast } = useToast();

  const [documents, setDocuments] = useState<MaterialDeliveryDocument[]>([]);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [objectId, setObjectId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [lines, setLines] = useState<MaterialDeliveryDocumentLine[]>([{ ...EMPTY_LINE }]);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoadState("loading");
    try {
      const [deliveriesResult, objectsResult] = await Promise.all([listMaterialDeliveries(1, 100), listObjects(1, 100)]);
      setDocuments(groupByDocument(deliveriesResult.items));
      setObjects(objectsResult.items);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить поступления"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const objectNameById = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);

  const kpis = useMemo(() => {
    const totalValue = documents.reduce((sum, doc) => sum + doc.lines.reduce((s, l) => s + l.qty * l.unitCost, 0), 0);
    return { documents: documents.length, lines: documents.reduce((sum, d) => sum + d.lines.length, 0), totalValue };
  }, [documents]);

  function openCreate() {
    setObjectId(objects[0]?.id ?? "");
    setSupplierName("");
    setLines([{ ...EMPTY_LINE }]);
    setCreateError("");
    setCreateOpen(true);
  }

  function updateLine(index: number, patch: Partial<MaterialDeliveryDocumentLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    if (!objectId) {
      setCreateError("Выберите объект");
      return;
    }
    const validLines = lines.filter((l) => l.materialName.trim() && l.unit.trim() && l.qty > 0);
    if (validLines.length === 0) {
      setCreateError("Добавьте хотя бы одну позицию с материалом, единицей и количеством > 0");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const created = await createMaterialDeliveryDocument(objectId, supplierName.trim() || undefined, validLines);
      const createdObjectName = created.lines[0]?.objectName ?? objectNameById.get(created.objectId) ?? "—";
      setDocuments((current) => [
        { documentId: created.documentId, objectId: created.objectId, objectName: createdObjectName, supplierName: created.supplierName, deliveredAt: created.deliveredAt, lines: created.lines },
        ...current,
      ]);
      setCreateOpen(false);
      showToast("Поступление добавлено");
    } catch (error) {
      setCreateError(describeError(error, "Не удалось сохранить поступление"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppLayout
      title="Поступления материалов"
      subtitle="Документы поступления материалов на объекты"
      action={<Button onClick={openCreate} disabled={objects.length === 0}><Plus size={15} /> Добавить поступление</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Документов" value={String(kpis.documents)} icon={Boxes} tone="orange" footer="Всего поступлений" />
        <MetricCard label="Позиций" value={String(kpis.lines)} icon={Boxes} tone="blue" footer="Строк материалов" />
        <MetricCard label="Сумма" value={formatCurrency(kpis.totalValue)} icon={Boxes} tone="green" footer="Общая стоимость" />
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
        documents.length === 0 ? (
          <Card className="mt-4"><EmptyState icon={Boxes} title="Поступлений пока нет" description="Добавьте первое поступление материалов" /></Card>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {documents.map((doc) => (
              <Card key={doc.documentId} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-ink">{doc.objectName}</span>
                    {doc.supplierName && <span className="ml-2 text-sm text-ink-muted">от {doc.supplierName}</span>}
                  </div>
                  <span className="text-xs text-ink-muted">{new Date(doc.deliveredAt).toLocaleString("ru-RU")}</span>
                </div>
                <table className="mt-3 w-full text-sm">
                  <thead><tr className="text-left text-xs text-ink-muted"><th className="pb-1">Материал</th><th className="pb-1">Кол-во</th><th className="pb-1">Цена</th><th className="pb-1 text-right">Сумма</th></tr></thead>
                  <tbody>
                    {doc.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="py-1 text-ink">{line.materialName}</td>
                        <td className="py-1 text-ink-secondary">{line.qty} {line.unit}</td>
                        <td className="py-1 text-ink-secondary">{formatCurrency(line.unitCost)}</td>
                        <td className="py-1 text-right tabular text-ink">{formatCurrency(line.qty * line.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        )
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Добавить поступление" size="lg">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label><span>Объект</span><CustomSelect fullWidth value={objectId} onValueChange={setObjectId} options={objects.map((o) => ({ value: o.id, label: o.name }))} /></label>
          <label><span>Поставщик</span><input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="ООО «Стройматериалы»" /></label>

          <div>
            <span className="text-sm font-medium text-ink">Позиции</span>
            <div className="mt-2 flex flex-col gap-2">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
                  <input placeholder="Материал" value={line.materialName} onChange={(e) => updateLine(index, { materialName: e.target.value })} />
                  <input placeholder="Ед." value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} />
                  <input type="number" min="0" step="0.001" placeholder="Кол-во" value={line.qty || ""} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} />
                  <input type="number" min="0" step="0.01" placeholder="Цена" value={line.unitCost || ""} onChange={(e) => updateLine(index, { unitCost: Number(e.target.value) })} />
                  <Button type="button" variant="secondary" size="sm" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length === 1}><Trash2 size={13} /></Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])} style={{ marginTop: 8 }}>
              <Plus size={13} /> Добавить строку
            </Button>
          </div>

          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={creating}>{creating ? "Сохранение..." : "Сохранить"}</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
