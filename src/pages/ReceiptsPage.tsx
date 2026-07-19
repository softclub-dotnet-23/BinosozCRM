import { useMemo, useState } from "react";
import { Banknote, Boxes, Download, Eye, FileInput, LayoutGrid, Pencil, Plus, RefreshCw, Trash2, UserCog } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { ReceiptFormModal } from "../components/materials/ReceiptFormModal";
import { ReceiptDetailDrawer } from "../components/materials/ReceiptDetailDrawer";
import {
  RECEIPT_SUPPLIERS,
  RECEIPT_OBJECTS,
  RECEIPT_BRIGADES,
  receiptQuantity,
  receiptTotal,
  receiptUnit,
} from "../data/mockMaterialReceipts";
import { materialReceiptsRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { computeReceiptKpis } from "../utils/receiptAnalytics";
import { adjustMaterialStock } from "../utils/materialStockEffects";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import type { MaterialReceipt, ReceiptFilters } from "../types";

const DEFAULT_FILTERS: ReceiptFilters = {
  supplier: "all",
  objectName: "all",
  brigadeName: "all",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-30",
};

const selectClass =
  "w-full h-9 rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const toolbarSelectClass =
  "h-9 rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink";

function formatCompactAmount(value: number): string {
  if (value < 100000) return formatNumber(Math.round(value * 10) / 10);
  return `${formatNumber(Math.round(value / 1000))} тыс.`;
}

/** sign = 1 applies a receipt (stock increases at its warehouse); sign = -1 reverses it. */
function applyReceiptStockEffect(receipt: MaterialReceipt, sign: 1 | -1) {
  receipt.lines.forEach((line) => {
    adjustMaterialStock(line.materialName, receipt.warehouse, sign * line.quantity);
  });
}

export default function ReceiptsPage() {
  const { showToast } = useToast();

  const [receipts, setReceipts] = useRepositoryState(materialReceiptsRepository);
  const [search, setSearch] = usePersistentState("filters.receipts.search", "");
  const [filters, setFilters] = usePersistentState<ReceiptFilters>("filters.receipts.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formReceipt, setFormReceipt] = useState<MaterialReceipt | null | undefined>(undefined);
  const [viewReceipt, setViewReceipt] = useState<MaterialReceipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialReceipt | null>(null);

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return receipts.filter((r) => {
      if (query) {
        const haystack = `${r.documentNumber} ${r.supplier} ${r.objectName} ${r.invoiceNumber} ${r.responsible} ${r.lines
          .map((l) => l.materialName)
          .join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.supplier !== "all" && r.supplier !== filters.supplier) return false;
      if (filters.objectName !== "all" && r.objectName !== filters.objectName) return false;
      if (filters.brigadeName !== "all" && r.brigadeName !== filters.brigadeName) return false;
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      return true;
    });
  }, [receipts, search, filters]);

  const kpis = useMemo(() => computeReceiptKpis(filteredReceipts), [filteredReceipts]);

  const pageCount = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredReceipts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleSaveReceipt(receipt: MaterialReceipt) {
    const isEdit = receipts.some((r) => r.id === receipt.id);
    if (isEdit) {
      const previous = receipts.find((r) => r.id === receipt.id);
      if (previous) applyReceiptStockEffect(previous, -1); // reverse old effect first
    }
    applyReceiptStockEffect(receipt, 1); // apply new effect

    setReceipts((prev) => {
      if (isEdit) return prev.map((r) => (r.id === receipt.id ? receipt : r));
      const nextNumber = prev.length > 0 ? Math.max(...prev.map((r) => r.number)) + 1 : 1;
      const documentNumber = receipt.documentNumber.startsWith("ПР-НОВ") ? `ПР-${nextNumber}` : receipt.documentNumber;
      return [{ ...receipt, number: nextNumber, documentNumber }, ...prev];
    });
    setFormReceipt(undefined);
    setViewReceipt(null);
    showToast(isEdit ? "Поступление обновлено, остатки пересчитаны" : "Поступление добавлено, остатки склада обновлены");
  }

  function handleDuplicate(receipt: MaterialReceipt) {
    setViewReceipt(null);
    setFormReceipt({ ...receipt, id: "", documentNumber: "ПР-НОВ", date: "" });
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    applyReceiptStockEffect(deleteTarget, -1); // reverse its stock effect
    setReceipts((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setViewReceipt(null);
    showToast("Поступление удалено, остатки склада скорректированы", "info");
    setDeleteTarget(null);
  }

  function handleExport() {
    const header = ["Дата", "Номер", "Поставщик", "Объект", "Бригада", "Материалов", "Кол-во", "Сумма"];
    const rows = filteredReceipts.map((r) => [
      formatDateShort(r.date),
      r.documentNumber,
      r.supplier,
      r.objectName,
      r.brigadeName ?? "",
      r.lines.length,
      receiptQuantity(r).toFixed(2),
      receiptTotal(r).toFixed(2),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "postupleniya.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Поступления экспортированы");
  }

  const columns: DataTableColumn<MaterialReceipt>[] = [
    { key: "number", header: "№", render: (row) => <span className="text-ink-muted">{row.number}</span> },
    { key: "date", header: "Дата", render: (row) => <span className="whitespace-nowrap text-ink">{formatDateShort(row.date)}</span> },
    { key: "doc", header: "Номер", render: (row) => <span className="whitespace-nowrap font-semibold text-ink">{row.documentNumber}</span> },
    { key: "supplier", header: "Поставщик", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.supplier}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.objectName}</span> },
    { key: "materials", header: "Материалов", render: (row) => <span className="tabular text-ink-secondary">{row.lines.length}</span> },
    {
      key: "quantity",
      header: "Кол-во (ед.)",
      render: (row) => {
        const unit = receiptUnit(row);
        return (
          <span className="tabular whitespace-nowrap font-semibold text-ink">
            {formatNumber(receiptQuantity(row))}
            {unit ? ` ${unit}` : ""}
          </span>
        );
      },
    },
    {
      key: "total",
      header: "Сумма (сомони)",
      render: (row) => <span className="tabular whitespace-nowrap font-semibold text-ink">{formatNumber(receiptTotal(row))}</span>,
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть поступление" onClick={() => setViewReceipt(row)} className={iconButtonClass}>
            <Eye size={14} />
          </button>
          <button type="button" aria-label="Редактировать поступление" onClick={() => setFormReceipt(row)} className={iconButtonClass}>
            <Pencil size={14} />
          </button>
          <DropdownMenu
            trigger={<span className={iconButtonClass}>⋯</span>}
            items={[
              { label: "Просмотреть", icon: <Eye size={14} />, onClick: () => setViewReceipt(row) },
              { label: "Дублировать", icon: <FileInput size={14} />, onClick: () => handleDuplicate(row) },
              { label: "Скачать накладную", icon: <Download size={14} />, onClick: () => showToast("Накладная скачана", "info") },
              { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Поступления"
      subtitle="Учет поступлений материалов на склад"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setPage(1);
        },
        placeholder: "Поиск по поступлениям...",
      }}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Всего поступлений" value={String(kpis.count)} icon={Boxes} tone="green" footer="Документа" />
            <MetricCard label="Поступило материалов" value={formatCompactAmount(kpis.totalQuantity)} icon={LayoutGrid} tone="blue" footer="Ед. измерения" />
            <MetricCard label="Общая стоимость" value={formatCompactAmount(kpis.totalCost)} icon={Banknote} tone="orange" footer="сомони" />
            <MetricCard label="Средняя стоимость" value={formatCompactAmount(kpis.averageCost)} icon={UserCog} tone="purple" footer="сомони" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-2.5">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }));
                  setPage(1);
                }}
                className="border-0 bg-transparent p-0 text-sm text-ink focus:outline-none"
              />
              <span className="text-ink-muted">–</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateTo: e.target.value }));
                  setPage(1);
                }}
                className="border-0 bg-transparent p-0 text-sm text-ink focus:outline-none"
              />
            </div>
            <select
              value={filters.supplier}
              onChange={(e) => {
                setFilters((f) => ({ ...f, supplier: e.target.value }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Поставщик: Все</option>
              {RECEIPT_SUPPLIERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filters.objectName}
              onChange={(e) => {
                setFilters((f) => ({ ...f, objectName: e.target.value }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Объект: Все</option>
              {RECEIPT_OBJECTS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <select
              value={filters.brigadeName}
              onChange={(e) => {
                setFilters((f) => ({ ...f, brigadeName: e.target.value }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Бригада: Все</option>
              {RECEIPT_BRIGADES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} onRowClick={(row) => setViewReceipt(row)} />
            ) : (
              <EmptyState
                icon={Boxes}
                title="Поступления не найдены"
                description="Измените параметры поиска или сбросьте фильтры"
                action={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Сбросить фильтры
                  </Button>
                }
              />
            )}
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredReceipts.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="записей"
            />
          </Card>
        </div>

        <div className="flex w-full flex-col gap-4 xl:w-70 xl:shrink-0">
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => setFormReceipt(null)}>
              <Plus size={16} /> Новое поступление
            </Button>
            <Button variant="outline" className="w-full" onClick={handleExport}>
              <Download size={16} /> Экспорт
            </Button>
          </div>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Фильтры</h2>
            <div className="mt-4 space-y-3.5">
              <div>
                <p className="text-xs font-medium text-ink-secondary">Период</p>
                <div className="mt-1.5 flex flex-col gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className={selectClass}
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className={selectClass}
                  />
                </div>
              </div>

              <FilterField label="Поставщик">
                <select value={filters.supplier} onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value }))} className={selectClass}>
                  <option value="all">Все поставщики</option>
                  {RECEIPT_SUPPLIERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Объект">
                <select
                  value={filters.objectName}
                  onChange={(e) => setFilters((f) => ({ ...f, objectName: e.target.value }))}
                  className={selectClass}
                >
                  <option value="all">Все объекты</option>
                  {RECEIPT_OBJECTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Бригада">
                <select
                  value={filters.brigadeName}
                  onChange={(e) => setFilters((f) => ({ ...f, brigadeName: e.target.value }))}
                  className={selectClass}
                >
                  <option value="all">Все бригады</option>
                  {RECEIPT_BRIGADES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </FilterField>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => setPage(1)}>
                Применить
              </Button>
              <Button variant="outline" className="flex-1" onClick={resetFilters}>
                Сбросить
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Итоги за период</h2>
            <dl className="mt-3.5 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Документов</dt>
                <dd className="font-bold text-ink tabular">{kpis.count}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Кол-во (ед.)</dt>
                <dd className="font-bold text-ink tabular">{formatNumber(Math.round(kpis.totalQuantity * 10) / 10)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Сумма (сомони)</dt>
                <dd className="font-bold text-ink tabular">{formatCurrency(Math.round(kpis.totalCost))}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <ReceiptFormModal
        open={formReceipt !== undefined}
        receipt={formReceipt ?? null}
        existingInvoiceNumbers={receipts.map((r) => r.invoiceNumber)}
        onClose={() => setFormReceipt(undefined)}
        onSave={handleSaveReceipt}
      />

      <ReceiptDetailDrawer
        receipt={viewReceipt}
        onClose={() => setViewReceipt(null)}
        onEdit={(r) => {
          setViewReceipt(null);
          setFormReceipt(r);
        }}
        onDuplicate={handleDuplicate}
        onDelete={(r) => {
          setViewReceipt(null);
          setDeleteTarget(r);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить поступление?"
        description={
          deleteTarget
            ? `Поступление «${deleteTarget.documentNumber}» будет удалено. Остатки склада, увеличенные этим поступлением, будут скорректированы.`
            : undefined
        }
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
