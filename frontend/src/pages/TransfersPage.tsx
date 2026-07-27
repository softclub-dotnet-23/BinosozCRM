import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Ban,
  Copy,
  Download,
  Eye,
  History,
  Layers,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { CustomSelect } from "../components/ui/CustomSelect";
import { TransferFormModal } from "../components/materials/TransferFormModal";
import { TransferDetailDrawer } from "../components/materials/TransferDetailDrawer";
import {
  TRANSFER_LOCATIONS,
  TRANSFER_OBJECTS,
  transferQuantity,
  transferTotal,
} from "../data/mockMaterialTransfers";
import { materialTransfersRepository, employeesRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { cn } from "../utils/cn";
import { usePersistentState } from "../hooks/usePersistentState";
import { responsiblePersonName } from "../utils/responsiblePerson";
import { computeTransferKpis, computeFrequentRoutes } from "../utils/transferAnalytics";
import { adjustMaterialStock } from "../utils/materialStockEffects";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import type { MaterialTransfer, TransferFilters } from "../types";

const DEFAULT_FILTERS: TransferFilters = {
  fromWarehouse: "all",
  toWarehouse: "all",
  objectName: "all",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-30",
};

const selectClass =
  "w-full h-9 rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink";

function formatCompactAmount(value: number): string {
  if (value < 100000) return formatNumber(Math.round(value * 10) / 10);
  return `${formatNumber(Math.round(value / 1000))} тыс.`;
}

/** Reverses (positive) or applies (negative) a transfer's stock effect for every line. */
// sign = -1 applies a transfer (source -qty, destination +qty); sign = +1 reverses it.
function applyTransferStockEffect(transfer: MaterialTransfer, sign: 1 | -1) {
  transfer.lines.forEach((line) => {
    adjustMaterialStock(line.materialName, transfer.fromWarehouse, sign * line.quantity);
    adjustMaterialStock(line.materialName, transfer.toWarehouse, -sign * line.quantity);
  });
}

/** A cancelled transfer has already had its stock effect reversed and must not be reversed again. */
function isStockActive(transfer: MaterialTransfer): boolean {
  return transfer.status !== "cancelled";
}

export default function TransfersPage() {
  const { showToast } = useToast();

  const [transfers, setTransfers] = useRepositoryState(materialTransfersRepository);
  const employees = useRepositorySnapshot(employeesRepository);
  const [search, setSearch] = usePersistentState("filters.transfers.search", "");
  const [filters, setFilters] = usePersistentState<TransferFilters>("filters.transfers.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formTransfer, setFormTransfer] = useState<MaterialTransfer | null | undefined>(undefined);
  const [viewTransfer, setViewTransfer] = useState<MaterialTransfer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialTransfer | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MaterialTransfer | null>(null);

  const filteredTransfers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transfers.filter((t) => {
      if (query) {
        const haystack = `${t.documentNumber} ${t.fromWarehouse} ${t.toWarehouse} ${t.objectName ?? ""} ${responsiblePersonName(
          t.responsible,
          employees,
        )} ${t.note} ${t.lines.map((l) => l.materialName).join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.fromWarehouse !== "all" && t.fromWarehouse !== filters.fromWarehouse) return false;
      if (filters.toWarehouse !== "all" && t.toWarehouse !== filters.toWarehouse) return false;
      if (filters.objectName !== "all" && t.objectName !== filters.objectName) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      return true;
    });
  }, [transfers, search, filters, employees]);

  const kpis = useMemo(() => computeTransferKpis(filteredTransfers), [filteredTransfers]);
  const frequentRoutes = useMemo(() => computeFrequentRoutes(filteredTransfers), [filteredTransfers]);

  const pageCount = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredTransfers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleSaveTransfer(transfer: MaterialTransfer) {
    const isEdit = transfers.some((t) => t.id === transfer.id);
    if (isEdit) {
      const previous = transfers.find((t) => t.id === transfer.id);
      if (previous && isStockActive(previous)) applyTransferStockEffect(previous, 1); // reverse old effect, unless already cancelled
    }
    if (isStockActive(transfer)) applyTransferStockEffect(transfer, -1); // apply new effect

    setTransfers((prev) => {
      if (isEdit) return prev.map((t) => (t.id === transfer.id ? transfer : t));
      const nextNumber = prev.length > 0 ? Math.max(...prev.map((t) => t.number)) + 1 : 1;
      const documentNumber = transfer.documentNumber.startsWith("ПМ-НОВ") ? `ПМ-${nextNumber}` : transfer.documentNumber;
      return [{ ...transfer, number: nextNumber, documentNumber }, ...prev];
    });
    setFormTransfer(undefined);
    setViewTransfer(null);
    showToast(isEdit ? "Перемещение обновлено, остатки складов пересчитаны" : "Перемещение создано, остатки складов обновлены");
  }

  function handleDuplicate(transfer: MaterialTransfer) {
    setViewTransfer(null);
    setFormTransfer({ ...transfer, id: "", documentNumber: "ПМ-НОВ", date: "", status: "pending" });
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    if (isStockActive(deleteTarget)) applyTransferStockEffect(deleteTarget, 1); // restore balances, unless already cancelled
    setTransfers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setViewTransfer(null);
    showToast("Перемещение удалено, остатки складов восстановлены", "info");
    setDeleteTarget(null);
  }

  function handleCancelConfirmed() {
    if (!cancelTarget) return;
    if (isStockActive(cancelTarget)) applyTransferStockEffect(cancelTarget, 1); // restore balances, keep the document for audit
    setTransfers((prev) => prev.map((t) => (t.id === cancelTarget.id ? { ...t, status: "cancelled" } : t)));
    setViewTransfer(null);
    showToast("Перемещение отменено, остатки складов восстановлены", "info");
    setCancelTarget(null);
  }

  function handleExport() {
    const header = ["Дата", "Номер", "Откуда", "Куда", "Объект", "Материалов", "Кол-во", "Сумма", "Ответственный"];
    const rows = filteredTransfers.map((t) => [
      formatDateShort(t.date),
      t.documentNumber,
      t.fromWarehouse,
      t.toWarehouse,
      t.objectName ?? "",
      t.lines.length,
      transferQuantity(t).toFixed(2),
      transferTotal(t).toFixed(2),
      responsiblePersonName(t.responsible, employees),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "peremeshcheniya.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Перемещения экспортированы");
  }

  const columns: DataTableColumn<MaterialTransfer>[] = [
    { key: "number", header: "№", render: (row) => <span className="text-ink-muted">{row.number}</span> },
    { key: "date", header: "Дата", render: (row) => <span className="whitespace-nowrap text-ink">{formatDateShort(row.date)}</span> },
    {
      key: "doc",
      header: "Номер",
      render: (row) => (
        <span className={cn("whitespace-nowrap font-semibold", row.status === "cancelled" ? "text-ink-muted line-through" : "text-ink")}>
          {row.documentNumber}
          {row.status === "cancelled" && <span className="ml-1.5 text-xs font-medium text-red no-underline">отменено</span>}
        </span>
      ),
    },
    { key: "from", header: "Откуда", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.fromWarehouse}</span> },
    { key: "to", header: "Куда", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.toWarehouse}</span> },
    { key: "materials", header: "Материалов", render: (row) => <span className="tabular text-ink-secondary">{row.lines.length}</span> },
    {
      key: "quantity",
      header: "Кол-во (ед.)",
      render: (row) => <span className="tabular whitespace-nowrap font-semibold text-ink">{formatNumber(transferQuantity(row))}</span>,
    },
    {
      key: "total",
      header: "Сумма (сомони)",
      render: (row) => <span className="tabular whitespace-nowrap font-semibold text-ink">{formatNumber(transferTotal(row))}</span>,
    },
    {
      key: "responsible",
      header: "Кто перенес",
      render: (row) => {
        const name = responsiblePersonName(row.responsible, employees);
        return (
          <div className="flex items-center gap-2">
            <Avatar name={name} size="sm" />
            <span className="whitespace-nowrap text-ink">{name}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть перемещение" onClick={() => setViewTransfer(row)} className={iconButtonClass}>
            <Eye size={14} />
          </button>
          <button type="button" aria-label="Редактировать перемещение" onClick={() => setFormTransfer(row)} className={iconButtonClass}>
            <Pencil size={14} />
          </button>
          <DropdownMenu
            trigger={<span className={iconButtonClass}>⋯</span>}
            items={[
              { label: "Просмотреть", icon: <Eye size={14} />, onClick: () => setViewTransfer(row) },
              { label: "Редактировать", icon: <Pencil size={14} />, onClick: () => setFormTransfer(row) },
              { label: "Дублировать", icon: <Copy size={14} />, onClick: () => handleDuplicate(row) },
              { label: "Печать", icon: <Printer size={14} />, onClick: () => showToast("Печать перемещения запущена", "info") },
              { label: "Скачать документ", icon: <Download size={14} />, onClick: () => showToast("Документ скачан", "info") },
              { label: "История изменений", icon: <History size={14} />, onClick: () => showToast("История изменений пока в разработке", "info") },
              {
                label: "Отменить",
                icon: <Ban size={14} />,
                onClick: () => setCancelTarget(row),
                danger: true,
                disabled: row.status === "cancelled",
              },
              { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Перемещения"
      subtitle="Учет перемещений материалов между складами и объектами"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setPage(1);
        },
        placeholder: "Поиск по перемещениям...",
      }}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Всего перемещений" value={String(kpis.count)} icon={ArrowLeftRight} tone="orange" footer="документов" />
            <MetricCard label="Перемещено материалов" value={formatCompactAmount(kpis.totalQuantity)} icon={Layers} tone="blue" footer="ед. измерения" />
            <MetricCard label="Общая стоимость" value={formatCompactAmount(kpis.totalCost)} icon={Banknote} tone="orange" footer="сомони" />
            <MetricCard label="Ср. стоимость" value={formatCompactAmount(kpis.averageCost)} icon={TrendingUp} tone="purple" footer="сомони" />
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
            <CustomSelect
              size="sm"
              aria-label="Откуда"
              value={filters.fromWarehouse}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, fromWarehouse: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Откуда: Все" }, ...TRANSFER_LOCATIONS.map((loc) => ({ value: loc, label: loc }))]}
            />
            <CustomSelect
              size="sm"
              aria-label="Куда"
              value={filters.toWarehouse}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, toWarehouse: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Куда: Все" }, ...TRANSFER_LOCATIONS.map((loc) => ({ value: loc, label: loc }))]}
            />
            <CustomSelect
              size="sm"
              aria-label="Объект"
              value={filters.objectName}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, objectName: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Объект: Все" }, ...TRANSFER_OBJECTS.map((o) => ({ value: o, label: o }))]}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} onRowClick={(row) => setViewTransfer(row)} />
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title="Перемещения не найдены"
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
              total={filteredTransfers.length}
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
            <Button className="w-full" onClick={() => setFormTransfer(null)}>
              <Plus size={16} /> Новое перемещение
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

              <FilterField label="Откуда">
                <CustomSelect
                  value={filters.fromWarehouse}
                  onValueChange={(v) => setFilters((f) => ({ ...f, fromWarehouse: v }))}
                  options={[{ value: "all", label: "Все склады и объекты" }, ...TRANSFER_LOCATIONS.map((loc) => ({ value: loc, label: loc }))]}
                />
              </FilterField>

              <FilterField label="Куда">
                <CustomSelect
                  value={filters.toWarehouse}
                  onValueChange={(v) => setFilters((f) => ({ ...f, toWarehouse: v }))}
                  options={[{ value: "all", label: "Все склады и объекты" }, ...TRANSFER_LOCATIONS.map((loc) => ({ value: loc, label: loc }))]}
                />
              </FilterField>

              <FilterField label="Объект">
                <CustomSelect
                  value={filters.objectName}
                  onValueChange={(v) => setFilters((f) => ({ ...f, objectName: v }))}
                  options={[{ value: "all", label: "Все объекты" }, ...TRANSFER_OBJECTS.map((o) => ({ value: o, label: o }))]}
                />
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

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Частые перемещения</h2>
            <div className="mt-3.5 space-y-2.5 text-sm">
              {frequentRoutes.map(({ fromWarehouse, toWarehouse, count }) => (
                <button
                  key={`${fromWarehouse}->${toWarehouse}`}
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, fromWarehouse, toWarehouse }));
                    setPage(1);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-[#F5F5F4]"
                >
                  <span className="min-w-0 truncate text-ink-secondary">
                    {fromWarehouse} → {toWarehouse}
                  </span>
                  <span className="shrink-0 font-bold text-ink tabular">{count}</span>
                </button>
              ))}
              {frequentRoutes.length === 0 && <p className="text-ink-muted">Нет данных за период</p>}
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-xs font-semibold text-primary hover:text-primary-hover"
            >
              Все направления →
            </button>
          </Card>
        </div>
      </div>

      <TransferFormModal
        open={formTransfer !== undefined}
        transfer={formTransfer ?? null}
        existingDocumentNumbers={transfers.map((t) => t.documentNumber)}
        onClose={() => setFormTransfer(undefined)}
        onSave={handleSaveTransfer}
      />

      <TransferDetailDrawer
        transfer={viewTransfer}
        onClose={() => setViewTransfer(null)}
        onEdit={(t) => {
          setViewTransfer(null);
          setFormTransfer(t);
        }}
        onDuplicate={handleDuplicate}
        onCancel={(t) => {
          setViewTransfer(null);
          setCancelTarget(t);
        }}
        onDelete={(t) => {
          setViewTransfer(null);
          setDeleteTarget(t);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить перемещение?"
        description={
          deleteTarget
            ? `Перемещение «${deleteTarget.documentNumber}» будет удалено. Остатки складов-отправителя и получателя будут восстановлены.`
            : undefined
        }
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Отменить перемещение?"
        description={
          cancelTarget
            ? `Перемещение «${cancelTarget.documentNumber}» будет отменено. Остатки склада-отправителя и склада-получателя будут восстановлены, документ останется в списке со статусом «Отменено».`
            : undefined
        }
        confirmLabel="Отменить перемещение"
        danger
        onConfirm={handleCancelConfirmed}
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
