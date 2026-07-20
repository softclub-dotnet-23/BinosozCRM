import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Download, Eye, LayoutGrid, Pencil, RefreshCw, TrendingDown } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { CustomSelect } from "../components/ui/CustomSelect";
import { MaterialThumbnail } from "../components/materials/MaterialThumbnail";
import { MaterialStatusBadge } from "../components/materials/MaterialStatusBadge";
import { StockDetailDrawer } from "../components/materials/StockDetailDrawer";
import { StockAdjustmentModal } from "../components/materials/StockAdjustmentModal";
import { StockReservationModal } from "../components/materials/StockReservationModal";
import { DonutChart } from "../components/charts/DonutChart";
import { MATERIAL_WAREHOUSES, MATERIAL_CATEGORIES } from "../data/mockMaterials";
import {
  materialsRepository,
  materialReceiptsRepository,
  stockReservationsRepository,
  stockAdjustmentsRepository,
} from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { adjustMaterialStock } from "../utils/materialStockEffects";
import {
  buildStockRows,
  computeStockKpis,
  computeStockStatusBuckets,
  getCriticalStockRows,
} from "../utils/stockAnalytics";
import { useToast } from "../hooks/useToast";
import { formatNumber } from "../utils/format";
import { formatDateTimeShort } from "../utils/date";
import type { MaterialStockRow, StockAdjustment, StockFilters, StockReservation } from "../types";

const DEFAULT_FILTERS: StockFilters = {
  warehouse: "all",
  category: "all",
  status: "all",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-30",
};

const selectClass =
  "w-full h-9 rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink";

export default function StockPage() {
  const { showToast } = useToast();
  const [materials] = useRepositoryState(materialsRepository);
  const reservations = useRepositorySnapshot(stockReservationsRepository);
  const receipts = useRepositorySnapshot(materialReceiptsRepository);

  const [search, setSearch] = usePersistentState("filters.stock.search", "");
  const [filters, setFilters] = usePersistentState<StockFilters>("filters.stock.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailRow, setDetailRow] = useState<MaterialStockRow | null>(null);
  const [adjustRow, setAdjustRow] = useState<MaterialStockRow | null>(null);
  const [reserveRow, setReserveRow] = useState<MaterialStockRow | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<StockReservation | null>(null);

  const allRows = useMemo(() => buildStockRows(materials, reservations), [materials, reservations]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (query) {
        const haystack = `${r.materialName} ${r.category} ${r.warehouse} ${r.unit}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.warehouse !== "all" && r.warehouse !== filters.warehouse) return false;
      if (filters.category !== "all" && r.category !== filters.category) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      const updatedDate = (r.updatedAt ?? "").slice(0, 10);
      if (filters.dateFrom && updatedDate < filters.dateFrom) return false;
      if (filters.dateTo && updatedDate > filters.dateTo) return false;
      return true;
    });
  }, [allRows, search, filters]);

  const kpis = useMemo(() => computeStockKpis(filteredRows), [filteredRows]);
  const statusBuckets = useMemo(() => computeStockStatusBuckets(filteredRows, receipts), [filteredRows, receipts]);
  const criticalRows = useMemo(() => getCriticalStockRows(filteredRows, 4), [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleExport() {
    const header = [
      "Материал",
      "Поставщик",
      "Категория",
      "Склад",
      "Ед.",
      "Текущий остаток",
      "Резерв",
      "Доступно",
      "Мин. остаток",
      "Статус",
      "Цена",
      "Стоимость",
      "Последнее обновление",
    ];
    const rows = filteredRows.map((r) => {
      const material = materials.find((m) => m.id === r.id);
      return [
        r.materialName,
        material?.supplier ?? "",
        r.category,
        r.warehouse,
        r.unit,
        r.quantity,
        r.reserved,
        r.available,
        r.minStock,
        r.status,
        r.price.toFixed(2),
        (r.price * r.quantity).toFixed(2),
        formatDateTimeShort(r.updatedAt),
      ];
    });
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ostatki.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Остатки экспортированы");
  }

  function handleSaveAdjustment(adjustment: Omit<StockAdjustment, "id" | "createdDate">, delta: number) {
    adjustMaterialStock(adjustment.materialName, adjustment.warehouse, delta);
    void stockAdjustmentsRepository.create({
      ...adjustment,
      id: `adj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      createdDate: new Date().toISOString().slice(0, 10),
    });
    setAdjustRow(null);
    showToast("Остаток скорректирован");
  }

  function handleSaveReservation(reservation: Omit<StockReservation, "id" | "createdDate" | "status">) {
    void stockReservationsRepository.create({
      ...reservation,
      id: `resv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      status: "active",
      createdDate: new Date().toISOString().slice(0, 10),
    });
    setReserveRow(null);
    showToast("Материал зарезервирован");
  }

  function handleReleaseReservation(reservationId: string) {
    const reservation = reservations.find((r) => r.id === reservationId);
    if (reservation) setReleaseTarget(reservation);
  }

  function confirmReleaseReservation() {
    if (!releaseTarget) return;
    void stockReservationsRepository.update(releaseTarget.id, { status: "released" });
    showToast("Резерв снят");
  }

  const columns: DataTableColumn<MaterialStockRow>[] = [
    { key: "number", header: "№", render: (row) => <span className="text-ink-muted">{materials.find((m) => m.id === row.id)?.number ?? ""}</span> },
    {
      key: "material",
      header: "Материал",
      render: (row) => {
        const material = materials.find((m) => m.id === row.id);
        return (
          <div className="flex items-center gap-3">
            <MaterialThumbnail src={material?.imageUrl ?? ""} alt={row.materialName} className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="whitespace-nowrap font-semibold text-ink">{row.materialName}</p>
              <p className="whitespace-nowrap text-xs text-ink-muted">{material?.supplier}</p>
            </div>
          </div>
        );
      },
    },
    { key: "category", header: "Категория", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.category}</span> },
    { key: "warehouse", header: "Склад", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.warehouse}</span> },
    {
      key: "quantity",
      header: "Текущий остаток",
      render: (row) => (
        <span className="tabular whitespace-nowrap font-semibold text-ink">
          {formatNumber(row.quantity)} {row.unit}
        </span>
      ),
    },
    {
      key: "minStock",
      header: "Мин. остаток",
      render: (row) => (
        <span className="tabular whitespace-nowrap text-ink-secondary">
          {formatNumber(row.minStock)} {row.unit}
        </span>
      ),
    },
    {
      key: "reserved",
      header: "Резерв",
      render: (row) => (
        <span className="tabular whitespace-nowrap text-warning">
          {formatNumber(row.reserved)} {row.unit}
        </span>
      ),
    },
    {
      key: "available",
      header: "Доступно",
      render: (row) => (
        <span className="tabular whitespace-nowrap text-green">
          {formatNumber(row.available)} {row.unit}
        </span>
      ),
    },
    { key: "status", header: "Статус", render: (row) => <MaterialStatusBadge status={row.status} /> },
    {
      key: "updatedAt",
      header: "Последнее обновление",
      render: (row) => <span className="whitespace-nowrap text-xs text-ink-muted">{formatDateTimeShort(row.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть остаток" onClick={() => setDetailRow(row)} className={iconButtonClass}>
            <Eye size={14} />
          </button>
          <button type="button" aria-label="Корректировать остаток" onClick={() => setAdjustRow(row)} className={iconButtonClass}>
            <Pencil size={14} />
          </button>
          <DropdownMenu
            trigger={<span className={iconButtonClass}>⋯</span>}
            items={[
              { label: "Просмотреть", icon: <Eye size={14} />, onClick: () => setDetailRow(row) },
              { label: "Корректировать остаток", icon: <Pencil size={14} />, onClick: () => setAdjustRow(row) },
              { label: "Зарезервировать", onClick: () => setReserveRow(row) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Остатки"
      subtitle="Учет текущих остатков материалов по складам и объектам"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setPage(1);
        },
        placeholder: "Поиск по материалам...",
      }}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Всего позиций" value={String(kpis.totalPositions)} icon={LayoutGrid} tone="blue" footer="наименований" />
            <MetricCard label="В наличии" value={String(kpis.inStock)} icon={Boxes} tone="green" footer="позиций" />
            <MetricCard label="Низкий остаток" value={String(kpis.lowStock)} icon={TrendingDown} tone="orange" footer="позиций" />
            <MetricCard label="Критический остаток" value={String(kpis.critical)} icon={AlertTriangle} tone="red" footer="позиций" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink-secondary">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }));
                  setPage(1);
                }}
                className="w-27.5 bg-transparent text-ink focus:outline-none"
              />
              <span>–</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateTo: e.target.value }));
                  setPage(1);
                }}
                className="w-27.5 bg-transparent text-ink focus:outline-none"
              />
            </div>
            <CustomSelect
              size="sm"
              aria-label="Склад"
              value={filters.warehouse}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, warehouse: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Склад: Все" }, ...MATERIAL_WAREHOUSES.map((w) => ({ value: w, label: w }))]}
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Категория"
              value={filters.category}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, category: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Категория: Все" }, ...MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))]}
            />
            <CustomSelect
              size="sm"
              aria-label="Статус"
              value={filters.status}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, status: v as StockFilters["status"] }));
                setPage(1);
              }}
              options={[
                { value: "all", label: "Статус: Все" },
                { value: "normal", label: "В наличии" },
                { value: "low", label: "Низкий остаток" },
                { value: "critical", label: "Критический" },
              ]}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} onRowClick={(row) => setDetailRow(row)} />
            ) : (
              <EmptyState
                icon={Boxes}
                title="Остатки не найдены"
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
              total={filteredRows.length}
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
          <Button variant="outline" className="w-full" onClick={handleExport}>
            <Download size={16} /> Экспорт
          </Button>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Фильтры</h2>
            <div className="mt-4 space-y-3.5">
              <FilterField label="Поиск">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Название материала..."
                  className={selectClass}
                />
              </FilterField>

              <FilterField label="Категория">
                <CustomSelect
                  searchable
                  value={filters.category}
                  onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
                  options={[{ value: "all", label: "Все категории" }, ...MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))]}
                />
              </FilterField>

              <FilterField label="Склад">
                <CustomSelect
                  value={filters.warehouse}
                  onValueChange={(v) => setFilters((f) => ({ ...f, warehouse: v }))}
                  options={[{ value: "all", label: "Все склады" }, ...MATERIAL_WAREHOUSES.map((w) => ({ value: w, label: w }))]}
                />
              </FilterField>

              <FilterField label="Статус">
                <CustomSelect
                  value={filters.status}
                  onValueChange={(v) => setFilters((f) => ({ ...f, status: v as StockFilters["status"] }))}
                  options={[
                    { value: "all", label: "Все статусы" },
                    { value: "normal", label: "В наличии" },
                    { value: "low", label: "Низкий остаток" },
                    { value: "critical", label: "Критический" },
                  ]}
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
            <h2 className="text-[15px] font-bold text-ink">Статистика остатков</h2>
            {statusBuckets.length > 0 ? (
              <>
                <DonutChart
                  data={statusBuckets}
                  centerLabel="Всего позиций"
                  centerValue={String(kpis.totalPositions)}
                  size={176}
                  valueFormatter={(value) => formatNumber(value)}
                />
                <ul className="mt-4 w-full space-y-2.5">
                  {statusBuckets.map((bucket) => (
                    <li key={bucket.category} className="flex items-center gap-2.5 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bucket.color }} />
                      <span className="text-ink-secondary">{bucket.category}</span>
                      <span className="ml-auto shrink-0 font-semibold text-ink tabular">
                        {bucket.amount}{" "}
                        <span className="text-ink-muted">
                          ({kpis.totalPositions > 0 ? Math.round((bucket.amount / kpis.totalPositions) * 1000) / 10 : 0}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">Нет данных для отображения</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-ink">Критические остатки</h2>
              {criticalRows.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-[11px] font-bold text-white">
                  {criticalRows.length}
                </span>
              )}
            </div>
            <ul className="mt-3.5 space-y-3">
              {criticalRows.length > 0 ? (
                criticalRows.map((row) => {
                  const material = materials.find((m) => m.id === row.id);
                  return (
                    <li key={row.id}>
                      <button type="button" onClick={() => setDetailRow(row)} className="flex w-full items-center gap-2.5 text-left">
                        <MaterialThumbnail src={material?.imageUrl ?? ""} alt={row.materialName} className="h-9 w-9 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{row.materialName}</p>
                          <p className="text-xs text-ink-secondary">
                            Остаток:{" "}
                            <span className={row.status === "critical" ? "font-semibold text-red" : "font-semibold text-warning"}>
                              {formatNumber(row.quantity)} {row.unit}
                            </span>{" "}
                            (Мин. {formatNumber(row.minStock)})
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
              ) : (
                <p className="text-sm text-ink-muted">Критических остатков нет</p>
              )}
            </ul>
            <button
              type="button"
              onClick={() => {
                setFilters((f) => ({ ...f, status: "critical" }));
                setPage(1);
              }}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Все критические остатки →
            </button>
          </Card>
        </div>
      </div>

      <StockDetailDrawer
        row={detailRow}
        onClose={() => setDetailRow(null)}
        onAdjust={(row) => {
          setDetailRow(null);
          setAdjustRow(row);
        }}
        onReserve={(row) => {
          setDetailRow(null);
          setReserveRow(row);
        }}
        onReleaseReservation={handleReleaseReservation}
      />

      <StockAdjustmentModal
        open={Boolean(adjustRow)}
        row={adjustRow}
        onClose={() => setAdjustRow(null)}
        onSave={handleSaveAdjustment}
      />

      <StockReservationModal
        open={Boolean(reserveRow)}
        row={reserveRow}
        onClose={() => setReserveRow(null)}
        onSave={handleSaveReservation}
      />

      <ConfirmDialog
        open={Boolean(releaseTarget)}
        title="Снять резерв?"
        description={releaseTarget ? `${releaseTarget.materialName} · ${formatNumber(releaseTarget.quantity)} ед.` : undefined}
        confirmLabel="Снять резерв"
        onConfirm={confirmReleaseReservation}
        onClose={() => setReleaseTarget(null)}
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
