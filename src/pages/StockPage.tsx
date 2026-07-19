import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Download, Layers, RefreshCw, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { MaterialThumbnail } from "../components/materials/MaterialThumbnail";
import { MaterialStatusBadge } from "../components/materials/MaterialStatusBadge";
import { MaterialDetailDrawer } from "../components/materials/MaterialDetailDrawer";
import { MATERIAL_WAREHOUSES, MATERIAL_CATEGORIES } from "../data/mockMaterials";
import { materialsRepository } from "../data/repositories";
import { useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { getMaterialStatus, getMaterialTotalValue } from "../utils/materialAnalytics";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatNumber } from "../utils/format";
import type { Material, MaterialStatus } from "../types";

interface StockRow {
  material: Material;
  reserved: number;
  available: number;
  status: MaterialStatus;
}

interface StockFilters {
  warehouse: string;
  category: string;
  status: MaterialStatus | "all";
}

const DEFAULT_FILTERS: StockFilters = { warehouse: "all", category: "all", status: "all" };

const selectClass =
  "w-full h-9 rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const toolbarSelectClass =
  "h-9 rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

function formatCompactAmount(value: number): string {
  if (value < 100000) return formatNumber(Math.round(value * 10) / 10);
  return `${formatNumber(Math.round(value / 1000))} тыс.`;
}

function buildStockRows(materials: Material[]): StockRow[] {
  return materials.map((m) => {
    const reserved = Math.round(m.stock * (0.08 + ((m.number * 7) % 10) / 100) * 100) / 100;
    return { material: m, reserved, available: Math.round((m.stock - reserved) * 100) / 100, status: getMaterialStatus(m) };
  });
}

export default function StockPage() {
  const { showToast } = useToast();
  const materials = useRepositorySnapshot(materialsRepository);
  const [search, setSearch] = usePersistentState("filters.stock.search", "");
  const [filters, setFilters] = usePersistentState<StockFilters>("filters.stock.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);

  const allRows = useMemo(() => buildStockRows(materials), [materials]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (query && !r.material.name.toLowerCase().includes(query)) return false;
      if (filters.warehouse !== "all" && r.material.warehouse !== filters.warehouse) return false;
      if (filters.category !== "all" && r.material.category !== filters.category) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      return true;
    });
  }, [allRows, search, filters]);

  const kpis = useMemo(() => {
    const totalPositions = filteredRows.length;
    const totalStock = filteredRows.reduce((s, r) => s + r.material.stock, 0);
    const totalValue = filteredRows.reduce((s, r) => s + getMaterialTotalValue(r.material), 0);
    const criticalCount = filteredRows.filter((r) => r.status !== "normal").length;
    return { totalPositions, totalStock, totalValue, criticalCount };
  }, [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleExport() {
    const header = ["Материал", "Категория", "Склад", "Остаток", "Зарезервировано", "Доступно", "Мин. остаток", "Ед.", "Статус", "Стоимость"];
    const rows = filteredRows.map((r) => [
      r.material.name,
      r.material.category,
      r.material.warehouse,
      r.material.stock,
      r.reserved,
      r.available,
      r.material.minStock,
      r.material.unit,
      r.status,
      getMaterialTotalValue(r.material).toFixed(2),
    ]);
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

  const columns: DataTableColumn<StockRow>[] = [
    {
      key: "material",
      header: "Материал",
      render: (row) => (
        <div className="flex items-center gap-3">
          <MaterialThumbnail src={row.material.imageUrl} alt={row.material.name} className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="whitespace-nowrap font-semibold text-ink">{row.material.name}</p>
            <p className="whitespace-nowrap text-xs text-ink-muted">{row.material.category}</p>
          </div>
        </div>
      ),
    },
    { key: "warehouse", header: "Склад", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.material.warehouse}</span> },
    { key: "quantity", header: "Остаток", render: (row) => <span className="tabular whitespace-nowrap font-semibold text-ink">{formatNumber(row.material.stock)} {row.material.unit}</span> },
    { key: "reserved", header: "Зарезервировано", render: (row) => <span className="tabular whitespace-nowrap text-warning">{formatNumber(row.reserved)} {row.material.unit}</span> },
    { key: "available", header: "Доступно", render: (row) => <span className="tabular whitespace-nowrap text-green">{formatNumber(row.available)} {row.material.unit}</span> },
    { key: "minStock", header: "Мин. остаток", render: (row) => <span className="tabular whitespace-nowrap text-ink-secondary">{formatNumber(row.material.minStock)} {row.material.unit}</span> },
    { key: "status", header: "Статус", render: (row) => <MaterialStatusBadge status={row.status} /> },
  ];

  return (
    <AppLayout
      title="Остатки"
      subtitle="Остатки материалов по складам"
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
            <MetricCard label="Всего позиций" value={String(kpis.totalPositions)} icon={Layers} tone="green" footer="Наименований" />
            <MetricCard label="Общий остаток" value={formatCompactAmount(kpis.totalStock)} icon={Boxes} tone="blue" footer="Ед. измерения" />
            <MetricCard label="Общая стоимость" value={formatCompactAmount(kpis.totalValue)} icon={Wallet} tone="orange" footer="сомони" />
            <MetricCard label="Критических" value={String(kpis.criticalCount)} icon={AlertTriangle} tone="red" footer="Требуют внимания" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.warehouse}
              onChange={(e) => {
                setFilters((f) => ({ ...f, warehouse: e.target.value }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Склад: Все</option>
              {MATERIAL_WAREHOUSES.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select
              value={filters.category}
              onChange={(e) => {
                setFilters((f) => ({ ...f, category: e.target.value }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Категория: Все</option>
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((f) => ({ ...f, status: e.target.value as StockFilters["status"] }));
                setPage(1);
              }}
              className={toolbarSelectClass}
            >
              <option value="all">Статус: Все</option>
              <option value="normal">В норме</option>
              <option value="low">Низкий остаток</option>
              <option value="critical">Критический</option>
            </select>
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.material.id}
                onRowClick={(row) => setViewMaterial(row.material)}
              />
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
              itemLabel="позиций"
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
              <FilterField label="Склад">
                <select value={filters.warehouse} onChange={(e) => setFilters((f) => ({ ...f, warehouse: e.target.value }))} className={selectClass}>
                  <option value="all">Все склады</option>
                  {MATERIAL_WAREHOUSES.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Категория">
                <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className={selectClass}>
                  <option value="all">Все категории</option>
                  {MATERIAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Статус">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StockFilters["status"] }))}
                  className={selectClass}
                >
                  <option value="all">Все статусы</option>
                  <option value="normal">В норме</option>
                  <option value="low">Низкий остаток</option>
                  <option value="critical">Критический</option>
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
            <h2 className="text-[15px] font-bold text-ink">Итоги</h2>
            <dl className="mt-3.5 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Позиций</dt>
                <dd className="font-bold text-ink tabular">{kpis.totalPositions}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Общий остаток</dt>
                <dd className="font-bold text-ink tabular">{formatNumber(Math.round(kpis.totalStock * 10) / 10)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Стоимость (сомони)</dt>
                <dd className="font-bold text-ink tabular">{formatCurrency(Math.round(kpis.totalValue))}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <MaterialDetailDrawer material={viewMaterial} onClose={() => setViewMaterial(null)} />
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
