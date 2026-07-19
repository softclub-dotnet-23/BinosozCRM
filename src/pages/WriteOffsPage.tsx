import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, Download, Eye, Layers, Pencil, PackageMinus, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import { WriteOffFormModal } from "../components/materials/WriteOffFormModal";
import { WriteOffDetailDrawer } from "../components/materials/WriteOffDetailDrawer";
import { writeOffReasonLabel, WRITE_OFF_REASONS } from "../components/materials/InventoryStatusBadges";
import {
  WRITE_OFF_OBJECTS,
  WRITE_OFF_BRIGADES,
  writeOffQuantity,
  writeOffTotal,
} from "../data/mockMaterialWriteOffs";
import { materialWriteOffsRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { computeWriteOffKpis, computeFrequentReasons } from "../utils/writeOffAnalytics";
import { adjustMaterialStock } from "../utils/materialStockEffects";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import type { MaterialWriteOff, WriteOffFilters } from "../types";

const DEFAULT_FILTERS: WriteOffFilters = {
  objectName: "all",
  brigadeName: "all",
  reason: "all",
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

/** Reverses (positive) or applies (negative) a write-off's stock effect for every line. */
function applyWriteOffStockEffect(writeOff: MaterialWriteOff, sign: 1 | -1) {
  writeOff.lines.forEach((line) => {
    adjustMaterialStock(line.materialName, writeOff.warehouse, sign * line.quantity);
  });
}

export default function WriteOffsPage() {
  const { showToast } = useToast();

  const [writeOffs, setWriteOffs] = useRepositoryState(materialWriteOffsRepository);
  const [search, setSearch] = usePersistentState("filters.writeOffs.search", "");
  const [filters, setFilters] = usePersistentState<WriteOffFilters>("filters.writeOffs.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formWriteOff, setFormWriteOff] = useState<MaterialWriteOff | null | undefined>(undefined);
  const [viewWriteOff, setViewWriteOff] = useState<MaterialWriteOff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialWriteOff | null>(null);

  const filteredWriteOffs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return writeOffs.filter((w) => {
      if (query) {
        const haystack = `${w.documentNumber} ${w.objectName} ${w.brigadeName ?? ""} ${w.responsible} ${w.note} ${writeOffReasonLabel(
          w.reason,
        )} ${w.lines.map((l) => l.materialName).join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.objectName !== "all" && w.objectName !== filters.objectName) return false;
      if (filters.brigadeName !== "all" && w.brigadeName !== filters.brigadeName) return false;
      if (filters.reason !== "all" && w.reason !== filters.reason) return false;
      if (filters.dateFrom && w.date < filters.dateFrom) return false;
      if (filters.dateTo && w.date > filters.dateTo) return false;
      return true;
    });
  }, [writeOffs, search, filters]);

  const kpis = useMemo(() => computeWriteOffKpis(filteredWriteOffs), [filteredWriteOffs]);
  const frequentReasons = useMemo(() => computeFrequentReasons(filteredWriteOffs), [filteredWriteOffs]);

  const pageCount = Math.max(1, Math.ceil(filteredWriteOffs.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredWriteOffs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleSaveWriteOff(writeOff: MaterialWriteOff) {
    const isEdit = writeOffs.some((w) => w.id === writeOff.id);
    if (isEdit) {
      const previous = writeOffs.find((w) => w.id === writeOff.id);
      if (previous) applyWriteOffStockEffect(previous, 1); // reverse old effect
    }
    applyWriteOffStockEffect(writeOff, -1); // apply new effect

    setWriteOffs((prev) => {
      if (isEdit) return prev.map((w) => (w.id === writeOff.id ? writeOff : w));
      const nextNumber = prev.length > 0 ? Math.max(...prev.map((w) => w.number)) + 1 : 1;
      const documentNumber = writeOff.documentNumber.startsWith("СП-НОВ") ? `СП-${nextNumber}` : writeOff.documentNumber;
      return [{ ...writeOff, number: nextNumber, documentNumber }, ...prev];
    });
    setFormWriteOff(undefined);
    setViewWriteOff(null);
    showToast(isEdit ? "Списание обновлено, остатки склада пересчитаны" : "Списание создано, остатки склада уменьшены");
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    applyWriteOffStockEffect(deleteTarget, 1); // restore stock
    setWriteOffs((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    setViewWriteOff(null);
    showToast("Списание удалено, остатки склада восстановлены", "info");
    setDeleteTarget(null);
  }

  function handleExport() {
    const header = ["Дата", "Номер", "Объект", "Бригада", "Материалов", "Кол-во", "Сумма", "Причина", "Ответственный"];
    const rows = filteredWriteOffs.map((w) => [
      formatDateShort(w.date),
      w.documentNumber,
      w.objectName,
      w.brigadeName ?? "",
      w.lines.length,
      writeOffQuantity(w).toFixed(2),
      writeOffTotal(w).toFixed(2),
      writeOffReasonLabel(w.reason),
      w.responsible,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spisaniya.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Списания экспортированы");
  }

  const columns: DataTableColumn<MaterialWriteOff>[] = [
    { key: "number", header: "№", render: (row) => <span className="text-ink-muted">{row.number}</span> },
    { key: "date", header: "Дата", render: (row) => <span className="whitespace-nowrap text-ink">{formatDateShort(row.date)}</span> },
    { key: "doc", header: "Номер", render: (row) => <span className="whitespace-nowrap font-semibold text-ink">{row.documentNumber}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.objectName}</span> },
    { key: "brigade", header: "Бригада", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.brigadeName ?? "—"}</span> },
    { key: "materials", header: "Материалов", render: (row) => <span className="tabular text-ink-secondary">{row.lines.length}</span> },
    {
      key: "quantity",
      header: "Кол-во (ед.)",
      render: (row) => <span className="tabular whitespace-nowrap font-semibold text-ink">{formatNumber(writeOffQuantity(row))}</span>,
    },
    {
      key: "total",
      header: "Сумма (сомони)",
      render: (row) => <span className="tabular whitespace-nowrap font-semibold text-red">{formatNumber(writeOffTotal(row))}</span>,
    },
    { key: "reason", header: "Причина", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{writeOffReasonLabel(row.reason)}</span> },
    {
      key: "responsible",
      header: "Кто списал",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.responsible} size="sm" />
          <span className="whitespace-nowrap text-ink">{row.responsible}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть списание" onClick={() => setViewWriteOff(row)} className={iconButtonClass}>
            <Eye size={14} />
          </button>
          <button type="button" aria-label="Редактировать списание" onClick={() => setFormWriteOff(row)} className={iconButtonClass}>
            <Pencil size={14} />
          </button>
          <DropdownMenu
            trigger={<span className={iconButtonClass}>⋯</span>}
            items={[
              { label: "Просмотреть", icon: <Eye size={14} />, onClick: () => setViewWriteOff(row) },
              { label: "Скачать акт", icon: <Download size={14} />, onClick: () => showToast("Акт скачан", "info") },
              { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Списания"
      subtitle="Учет списаний материалов со склада"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setPage(1);
        },
        placeholder: "Поиск по списаниям...",
      }}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Всего списаний" value={String(kpis.count)} icon={PackageMinus} tone="green" footer="Документов" />
            <MetricCard label="Списано материалов" value={formatCompactAmount(kpis.totalQuantity)} icon={Layers} tone="blue" footer="Ед. измерения" />
            <MetricCard label="Общая стоимость" value={formatCompactAmount(kpis.totalCost)} icon={Banknote} tone="orange" footer="сомони" />
            <MetricCard label="Критичных списаний" value={String(kpis.criticalCount)} icon={AlertTriangle} tone="red" footer="Требуют проверки" />
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
              value={filters.objectName}
              onChange={(e) => {
                setFilters((f) => ({ ...f, objectName: e.target.value }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Объект: Все</option>
              {WRITE_OFF_OBJECTS.map((o) => (
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
              {WRITE_OFF_BRIGADES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              value={filters.reason}
              onChange={(e) => {
                setFilters((f) => ({ ...f, reason: e.target.value as WriteOffFilters["reason"] }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Причина: Все</option>
              {WRITE_OFF_REASONS.map((r) => (
                <option key={r} value={r}>
                  {writeOffReasonLabel(r)}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} onRowClick={(row) => setViewWriteOff(row)} />
            ) : (
              <EmptyState
                icon={PackageMinus}
                title="Списания не найдены"
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
              total={filteredWriteOffs.length}
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
            <Button className="w-full" onClick={() => setFormWriteOff(null)}>
              <Plus size={16} /> Новое списание
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

              <FilterField label="Объект">
                <select
                  value={filters.objectName}
                  onChange={(e) => setFilters((f) => ({ ...f, objectName: e.target.value }))}
                  className={selectClass}
                >
                  <option value="all">Все объекты</option>
                  {WRITE_OFF_OBJECTS.map((o) => (
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
                  {WRITE_OFF_BRIGADES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Причина">
                <select value={filters.reason} onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value as WriteOffFilters["reason"] }))} className={selectClass}>
                  <option value="all">Все причины</option>
                  {WRITE_OFF_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {writeOffReasonLabel(r)}
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

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Частые причины</h2>
            <div className="mt-3.5 space-y-2.5 text-sm">
              {frequentReasons.map(({ reason, count }) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setFilters((f) => ({ ...f, reason }));
                    setPage(1);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-[#F5F5F4]"
                >
                  <span className="text-ink-secondary">{writeOffReasonLabel(reason)}</span>
                  <span className="font-bold text-ink tabular">{count}</span>
                </button>
              ))}
              {frequentReasons.length === 0 && <p className="text-ink-muted">Нет данных за период</p>}
            </div>
          </Card>
        </div>
      </div>

      <WriteOffFormModal
        open={formWriteOff !== undefined}
        writeOff={formWriteOff ?? null}
        existingDocumentNumbers={writeOffs.map((w) => w.documentNumber)}
        onClose={() => setFormWriteOff(undefined)}
        onSave={handleSaveWriteOff}
      />

      <WriteOffDetailDrawer
        writeOff={viewWriteOff}
        onClose={() => setViewWriteOff(null)}
        onEdit={(w) => {
          setViewWriteOff(null);
          setFormWriteOff(w);
        }}
        onDelete={(w) => {
          setViewWriteOff(null);
          setDeleteTarget(w);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить списание?"
        description={
          deleteTarget
            ? `Списание «${deleteTarget.documentNumber}» будет удалено. Остатки склада, уменьшенные этим списанием, будут восстановлены.`
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
