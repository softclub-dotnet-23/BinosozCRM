import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ClipboardList, Loader2, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { DataTable, type DataTableColumn } from "../tables/DataTable";
import { EmptyState } from "../ui/EmptyState";
import { Pagination } from "../ui/Pagination";
import { Modal } from "../ui/Modal";
import { useToast } from "../../hooks/useToast";
import { ApiError, NetworkError } from "../../api/apiClient";
import { createEstimateItem, getEstimateItems, type EstimateItem } from "../../api/objectsApi";
import { formatCurrency, formatNumber } from "../../utils/format";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const CREATE_FORM_INITIAL = { workType: "", unit: "", plannedQty: "", plannedUnitPrice: "", stage: "" };

interface ObjectEstimateItemsProps {
  objectId: string;
}

export function ObjectEstimateItems({ objectId }: ObjectEstimateItemsProps) {
  const { showToast } = useToast();

  const [items, setItems] = useState<EstimateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  async function load(targetPage: number, targetPageSize: number) {
    setLoadState("loading");
    try {
      const result = await getEstimateItems(objectId, targetPage, targetPageSize);
      setItems(result.items);
      setTotal(result.totalCount);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить смету"));
      setLoadState("error");
    }
  }

  useEffect(() => {
    void load(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setCreateForm(CREATE_FORM_INITIAL);
    setCreateError("");
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    if (!createForm.workType.trim()) {
      setCreateError("Укажите наименование работы");
      return;
    }
    if (!createForm.unit.trim()) {
      setCreateError("Укажите единицу измерения");
      return;
    }
    const qty = Number(createForm.plannedQty);
    if (!createForm.plannedQty || Number.isNaN(qty) || qty < 0) {
      setCreateError("Укажите корректное количество");
      return;
    }
    const price = Number(createForm.plannedUnitPrice);
    if (!createForm.plannedUnitPrice || Number.isNaN(price) || price < 0) {
      setCreateError("Укажите корректную цену");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      await createEstimateItem(objectId, {
        workType: createForm.workType.trim(),
        unit: createForm.unit.trim(),
        plannedQty: qty,
        plannedUnitPrice: price,
        stage: createForm.stage.trim() || undefined,
      });
      setCreateOpen(false);
      showToast("Позиция сметы добавлена");
      setPage(1);
      await load(1, pageSize);
    } catch (error) {
      setCreateError(describeError(error, "Не удалось добавить позицию"));
    } finally {
      setCreating(false);
    }
  }

  const columns: DataTableColumn<EstimateItem>[] = [
    {
      key: "workType",
      header: "Наименование",
      width: "34%",
      render: (row) => (
        <div>
          <span className="font-medium text-ink">{row.workType}</span>
          {row.stage && <span className="block text-xs text-ink-muted">{row.stage}</span>}
        </div>
      ),
    },
    {
      key: "qty",
      header: "Кол-во",
      width: "18%",
      render: (row) => (
        <span className="tabular text-ink-secondary">
          {formatNumber(row.plannedQty)} {row.unit}
        </span>
      ),
    },
    { key: "price", header: "Цена", width: "22%", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.plannedUnitPrice)}</span> },
    {
      key: "sum",
      header: "Сумма",
      width: "26%",
      render: (row) => <span className="tabular font-semibold text-ink">{formatCurrency(row.plannedQty * row.plannedUnitPrice)}</span>,
    },
  ];

  return (
    <div className="border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-ink">Смета</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Добавить позицию
        </Button>
      </div>

      {loadState === "error" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red">
          <AlertCircle size={16} />
          <span>{loadError}</span>
          <Button size="sm" variant="secondary" onClick={() => void load(page, pageSize)}>
            Повторить
          </Button>
        </div>
      )}

      {loadState === "loading" && (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      )}

      {loadState === "ready" && (
        <>
          <div className="mt-3">
            {items.length > 0 ? (
              <DataTable columns={columns} rows={items} rowKey={(row) => row.id} />
            ) : (
              <EmptyState icon={ClipboardList} title="В смете пока нет позиций" description="Добавьте первую позицию сметы для этого объекта" />
            )}
          </div>

          {total > pageSize && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Добавить позицию сметы" size="md">
        <form className="users-modal-form" onSubmit={submitCreate}>
          <label>
            <span>Наименование работы</span>
            <input
              value={createForm.workType}
              onChange={(e) => setCreateForm((f) => ({ ...f, workType: e.target.value }))}
              placeholder="Кладка кирпича"
              autoFocus
            />
          </label>
          <label>
            <span>Единица измерения</span>
            <input value={createForm.unit} onChange={(e) => setCreateForm((f) => ({ ...f, unit: e.target.value }))} placeholder="м2" />
          </label>
          <label>
            <span>Количество</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={createForm.plannedQty}
              onChange={(e) => setCreateForm((f) => ({ ...f, plannedQty: e.target.value }))}
              placeholder="0"
            />
          </label>
          <label>
            <span>Цена за единицу</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={createForm.plannedUnitPrice}
              onChange={(e) => setCreateForm((f) => ({ ...f, plannedUnitPrice: e.target.value }))}
              placeholder="0"
            />
          </label>
          <label>
            <span>Этап (необязательно)</span>
            <input value={createForm.stage} onChange={(e) => setCreateForm((f) => ({ ...f, stage: e.target.value }))} placeholder="Черновая отделка" />
          </label>
          {createError && <p className="users-modal-error" role="alert">{createError}</p>}
          <div className="users-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
