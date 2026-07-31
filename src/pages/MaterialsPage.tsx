import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  Eye,
  Layers,
  LayoutGrid,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";
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
import { MaterialFormModal } from "../components/materials/MaterialFormModal";
import { MaterialDetailDrawer } from "../components/materials/MaterialDetailDrawer";
import { Avatar } from "../components/ui/Avatar";
import { MATERIAL_CATEGORIES, MATERIAL_SUPPLIERS } from "../data/mockMaterials";
import { writeOffQuantity } from "../data/mockMaterialWriteOffs";
import {
  materialsRepository,
  materialReceiptsRepository,
  materialWriteOffsRepository,
  materialTransfersRepository,
  employeesRepository,
} from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { computeMaterialKpis, getMaterialStatus, getMaterialTotalValue } from "../utils/materialAnalytics";
import { responsiblePersonName } from "../utils/responsiblePerson";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { useAuth } from "../context/AuthContext";
import type { Material, MaterialFilters, MaterialStatus } from "../types";
import BrigadirMaterialsPage from "./BrigadirMaterialsPage";

type TabKey = "all" | "critical" | "categories";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Все материалы" },
  { key: "critical", label: "Критический остаток" },
  { key: "categories", label: "По категориям" },
];

const DEFAULT_FILTERS: MaterialFilters = { search: "", category: "all", status: "all", supplier: "all" };

const STATUS_FILTER_OPTIONS: { value: MaterialStatus | "all"; label: string }[] = [
  { value: "all", label: "Все статусы" },
  { value: "normal", label: "В норме" },
  { value: "low", label: "Низкий остаток" },
  { value: "critical", label: "Критический" },
];

function formatCompactAmount(value: number): string {
  if (value < 100000) return formatNumber(Math.round(value));
  return `${formatNumber(Math.round(value / 1000))} тыс.`;
}

function stockColorClass(status: MaterialStatus): string {
  if (status === "critical") return "text-red";
  if (status === "low") return "text-warning";
  return "text-green";
}

export default function MaterialsPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirMaterialsPage />;
  return <CompanyMaterialsPage />;
}

function CompanyMaterialsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Brigadir gets read-only visibility into stock (to check availability / report shortages to
  // their Prorab) but not full warehouse management — that stays with Storekeeper/Prorab/Admin.
  const canManage = user?.role !== "brigadir";

  const [materials, setMaterials] = useRepositoryState(materialsRepository);
  const mockMaterialReceipts = useRepositorySnapshot(materialReceiptsRepository);
  const mockMaterialWriteOffs = useRepositorySnapshot(materialWriteOffsRepository);
  const transfersForDependencyCheck = useRepositorySnapshot(materialTransfersRepository);
  const employees = useRepositorySnapshot(employeesRepository);
  const [tab, setTab] = usePersistentState<TabKey>("filters.materials.tab", "all");
  const [search, setSearch] = usePersistentState("filters.materials.search", "");
  const [filters, setFilters] = usePersistentState<MaterialFilters>("filters.materials.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formMaterial, setFormMaterial] = useState<Material | null | undefined>(undefined);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

  const kpis = useMemo(() => computeMaterialKpis(materials), [materials]);
  const consumedInPeriod = useMemo(
    () => mockMaterialWriteOffs.reduce((s, w) => s + writeOffQuantity(w), 0),
    [mockMaterialWriteOffs],
  );

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (query && !`${m.name} ${m.supplier}`.toLowerCase().includes(query)) return false;
      if (filters.category !== "all" && m.category !== filters.category) return false;
      if (filters.supplier !== "all" && m.supplier !== filters.supplier) return false;
      const status = getMaterialStatus(m);
      if (filters.status !== "all" && status !== filters.status) return false;
      if (tab === "critical" && status === "normal") return false;
      return true;
    });
  }, [materials, search, filters, tab]);

  const categorySummary = useMemo(() => {
    const map = new Map<string, { category: string; count: number; totalStock: number; totalValue: number }>();
    for (const m of filteredMaterials) {
      const entry = map.get(m.category) ?? { category: m.category, count: 0, totalStock: 0, totalValue: 0 };
      entry.count += 1;
      entry.totalStock += m.stock;
      entry.totalValue += getMaterialTotalValue(m);
      map.set(m.category, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredMaterials]);

  const criticalItems = useMemo(
    () => materials.filter((m) => getMaterialStatus(m) !== "normal").sort((a, b) => a.stock / a.minStock - b.stock / b.minStock),
    [materials],
  );

  const recentOperations = useMemo(() => {
    type Op = { id: string; tone: "green" | "red"; title: string; value: string; date: string; responsibleName: string };
    const fromReceipts: Op[] = mockMaterialReceipts.flatMap((r) =>
      r.lines.map((l, i) => ({
        id: `${r.id}-${i}`,
        tone: "green" as const,
        title: `Поступление: ${l.materialName}`,
        value: `+${formatNumber(l.quantity)} ${l.unit}`,
        date: r.date,
        responsibleName: responsiblePersonName(r.responsible, employees),
      })),
    );
    const fromWriteOffs: Op[] = mockMaterialWriteOffs.flatMap((w) =>
      w.lines.map((l, i) => ({
        id: `${w.id}-${i}`,
        tone: "red" as const,
        title: `Списание: ${l.materialName}`,
        value: `-${formatNumber(l.quantity)} ${l.unit}`,
        date: w.date,
        responsibleName: responsiblePersonName(w.responsible, employees),
      })),
    );
    return [...fromReceipts, ...fromWriteOffs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  }, [mockMaterialReceipts, mockMaterialWriteOffs, employees]);

  const pageCount = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredMaterials.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleTabChange(next: TabKey) {
    setTab(next);
    setPage(1);
  }

  function handleSaveMaterial(material: Material) {
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === material.id);
      if (exists) return prev.map((m) => (m.id === material.id ? material : m));
      const nextNumber = prev.length > 0 ? Math.max(...prev.map((m) => m.number)) + 1 : 1;
      return [{ ...material, number: nextNumber }, ...prev];
    });
    setFormMaterial(undefined);
    showToast(formMaterial ? "Материал обновлён" : "Материал добавлен");
  }

  function hasDependentOperations(materialName: string): boolean {
    const inReceipts = mockMaterialReceipts.some((r) => r.lines.some((l) => l.materialName === materialName));
    const inWriteOffs = mockMaterialWriteOffs.some((w) => w.lines.some((l) => l.materialName === materialName));
    const inTransfers = transfersForDependencyCheck.some((t) => t.lines.some((l) => l.materialName === materialName));
    return inReceipts || inWriteOffs || inTransfers;
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    if (hasDependentOperations(deleteTarget.name)) {
      showToast("Материал нельзя удалить: по нему есть поступления, списания или перемещения", "error");
      setDeleteTarget(null);
      return;
    }
    setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    showToast("Материал удалён", "info");
    setDeleteTarget(null);
  }

  function handleExport() {
    const header = ["№", "Материал", "Поставщик", "Категория", "Ед.изм.", "Остаток", "Мин.остаток", "Цена", "Сумма", "Статус"];
    const rows = filteredMaterials.map((m) => [
      m.number,
      m.name,
      m.supplier,
      m.category,
      m.unit,
      m.stock,
      m.minStock,
      m.price,
      getMaterialTotalValue(m).toFixed(2),
      getMaterialStatus(m),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "materialy.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Материалы экспортированы");
  }

  const columns: DataTableColumn<Material>[] = [
    {
      key: "number",
      header: "№",
      sticky: "left",
      width: "44px",
      render: (row) => <span className="text-ink-muted">{row.number}</span>,
    },
    {
      key: "material",
      header: "Материал",
      sticky: "left",
      width: "248px",
      render: (row) => (
        <div className="flex items-center gap-3">
          <MaterialThumbnail src={row.imageUrl} alt={row.name} className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.name}</p>
            <p className="truncate text-xs text-ink-muted">{row.supplier}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Категория",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.category}</span>,
    },
    {
      key: "unit",
      header: "Ед. изм.",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.unit}</span>,
    },
    {
      key: "stock",
      header: "Остаток",
      render: (row) => (
        <span className={`tabular whitespace-nowrap font-semibold ${stockColorClass(getMaterialStatus(row))}`}>
          {formatNumber(row.stock)}
        </span>
      ),
    },
    {
      key: "minStock",
      header: "Мин. остаток",
      render: (row) => <span className="tabular whitespace-nowrap text-ink-secondary">{formatNumber(row.minStock)}</span>,
    },
    {
      key: "price",
      header: "Цена (сомони)",
      render: (row) => <span className="tabular whitespace-nowrap text-ink-secondary">{formatNumber(row.price)}</span>,
    },
    {
      key: "totalValue",
      header: "Общая стоимость",
      render: (row) => <span className="tabular whitespace-nowrap font-semibold text-ink">{formatNumber(getMaterialTotalValue(row))}</span>,
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => <MaterialStatusBadge status={getMaterialStatus(row)} />,
    },
    {
      key: "actions",
      header: "Действия",
      sticky: "right",
      width: "56px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={<MoreVertical size={16} />}
            items={[
              { label: "Просмотр", icon: <Eye size={14} />, onClick: () => setViewMaterial(row) },
              ...(canManage
                ? [
                    { label: "Редактировать", icon: <Pencil size={14} />, onClick: () => setFormMaterial(row) },
                    { label: "Создать поступление", icon: <TrendingUp size={14} />, onClick: () => showToast("Форма поступления пока в разработке", "info") },
                    { label: "Создать списание", icon: <TrendingDown size={14} />, onClick: () => showToast("Форма списания пока в разработке", "info") },
                    { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Склад и материалы"
      subtitle="Управление материалами и остатками на складе"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setPage(1);
        },
        placeholder: "Поиск по материалам...",
      }}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Всего материалов"
          value={String(kpis.totalCount)}
          icon={Layers}
          tone="green"
          footer={
            <>
              Наименований · <span className="font-semibold text-ink">{formatCompactAmount(kpis.totalValue)} сомони</span>
            </>
          }
        />
        <MetricCard label="Общий остаток" value={formatCompactAmount(kpis.totalStock)} icon={LayoutGrid} tone="blue" footer="Ед. измерения" />
        <MetricCard label="Израсходовано" value={formatNumber(Math.round(consumedInPeriod))} icon={TrendingUp} tone="purple" footer="Ед. измерения" />
        <Card className="flex min-w-0 flex-wrap items-center gap-2 p-4">
          {canManage && (
            <Button className="h-10 flex-1 min-w-[130px] justify-center" onClick={() => setFormMaterial(null)}>
              <Plus size={16} /> Добавить материал
            </Button>
          )}
          <Button variant="outline" className="h-10 flex-1 min-w-[110px] justify-center" onClick={handleExport}>
            <Download size={16} /> Экспорт
          </Button>
        </Card>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-5 pt-2 sm:px-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={`relative px-3 py-3 text-sm font-semibold transition-colors ${
                  tab === t.key ? "text-primary" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {t.label}
                {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 px-5 sm:px-6">
            <CustomSelect
              size="sm"
              searchable
              aria-label="Категория"
              value={filters.category}
              onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}
              options={[{ value: "all", label: "Категория: Все" }, ...MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))]}
            />
            <CustomSelect
              size="sm"
              aria-label="Статус"
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v as MaterialStatus | "all" }))}
              options={STATUS_FILTER_OPTIONS}
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Поставщик"
              value={filters.supplier}
              onValueChange={(v) => setFilters((f) => ({ ...f, supplier: v }))}
              options={[{ value: "all", label: "Поставщик: Все" }, ...MATERIAL_SUPPLIERS.map((s) => ({ value: s, label: s }))]}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
          </div>

          {tab === "categories" ? (
            <div className="divide-y divide-border">
              {categorySummary.map((row) => (
                <div key={row.category} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                  <div>
                    <p className="font-semibold text-ink">{row.category}</p>
                    <p className="text-xs text-ink-muted">{row.count} наименований</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-semibold text-ink">{formatCurrency(Math.round(row.totalValue))}</p>
                    <p className="tabular text-xs text-ink-muted">{formatNumber(Math.round(row.totalStock * 10) / 10)} ед.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : pageRows.length > 0 ? (
            <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} onRowClick={(row) => setViewMaterial(row)} />
          ) : (
            <EmptyState
              icon={Package}
              title="Материалы не найдены"
              description="Измените параметры поиска или сбросьте фильтры"
              action={
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              }
            />
          )}

          {tab !== "categories" && (
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredMaterials.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="материалов"
            />
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Критический остаток</h2>
              {criticalItems.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-xs font-bold text-white">
                  {criticalItems.length}
                </span>
              )}
            </div>
            <ul className="mt-3.5 max-h-72 space-y-3 overflow-y-auto pr-1">
              {criticalItems.slice(0, 6).map((m) => {
                const status = getMaterialStatus(m);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => setViewMaterial(m)} className="flex w-full items-start gap-2.5 text-left">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          status === "critical" ? "bg-red-soft text-red" : "bg-warning-soft text-warning"
                        }`}
                      >
                        {status === "critical" ? <AlertTriangle size={14} /> : <TrendingDown size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
                        <p className="text-xs text-ink-secondary">
                          Остаток:{" "}
                          <span className={`font-semibold ${status === "critical" ? "text-red" : "text-warning"}`}>
                            {formatNumber(m.stock)} {m.unit}
                          </span>{" "}
                          (Мин. {formatNumber(m.minStock)} {m.unit})
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => handleTabChange("critical")}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Смотреть все →
            </button>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-ink">Последние операции</h2>
            <ul className="mt-3.5 space-y-3">
              {recentOperations.length > 0 ? (
                recentOperations.map((op) => (
                  <OperationRow
                    key={op.id}
                    icon={op.tone === "green" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    tone={op.tone}
                    title={op.title}
                    value={op.value}
                    time={formatDateShort(op.date)}
                    responsibleName={op.responsibleName}
                  />
                ))
              ) : (
                <p className="text-sm text-ink-muted">Операций пока нет</p>
              )}
            </ul>
            <button
              type="button"
              onClick={() => navigate("/inventory/receipts")}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Все операции →
            </button>
          </Card>
        </div>
      </div>

      <MaterialFormModal
        open={formMaterial !== undefined}
        material={formMaterial ?? null}
        onClose={() => setFormMaterial(undefined)}
        onSave={handleSaveMaterial}
      />

      <MaterialDetailDrawer material={viewMaterial} onClose={() => setViewMaterial(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить материал?"
        description={deleteTarget ? `«${deleteTarget.name}» будет удалён из списка материалов.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}

function OperationRow({
  icon,
  tone,
  title,
  value,
  time,
  responsibleName,
}: {
  icon: React.ReactNode;
  tone: "green" | "red";
  title: string;
  value: string;
  time: string;
  responsibleName: string;
}) {
  const toneClass = tone === "green" ? "bg-green-soft text-green" : "bg-red-soft text-red";
  const valueClass = tone === "green" ? "text-green" : "text-red";
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{title}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Avatar name={responsibleName} size="sm" className="h-4 w-4 text-[8px]" />
          <p className="truncate text-xs text-ink-muted">
            {responsibleName} · {time}
          </p>
        </div>
      </div>
      <span className={`shrink-0 text-xs font-semibold tabular ${valueClass}`}>{value}</span>
    </li>
  );
}
