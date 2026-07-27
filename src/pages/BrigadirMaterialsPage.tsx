import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  Boxes,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Download,
  Eye,
  Filter,
  Package,
  PlusCircle,
  Search,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { MetricCard } from "../components/ui/MetricCard";
import { CustomSelect } from "../components/ui/CustomSelect";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { Avatar } from "../components/ui/Avatar";
import { MaterialThumbnail } from "../components/materials/MaterialThumbnail";
import { MaterialStatusBadge } from "../components/materials/MaterialStatusBadge";
import { MaterialDetailDrawer } from "../components/materials/MaterialDetailDrawer";
import { TransferStatusBadge, MaterialRequestStatusBadge } from "../components/materials/InventoryStatusBadges";
import { MaterialRequestFormModal } from "../components/materials/MaterialRequestFormModal";
import {
  materialsRepository,
  materialReceiptsRepository,
  materialWriteOffsRepository,
  materialTransfersRepository,
  materialRequestsRepository,
  employeesRepository,
} from "../data/repositories";
import { transferQuantity } from "../data/mockMaterialTransfers";
import { MATERIAL_CATEGORIES } from "../data/mockMaterials";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { computeMaterialKpis, getMaterialStatus, getMaterialTotalValue } from "../utils/materialAnalytics";
import { responsiblePersonName } from "../utils/responsiblePerson";
import { formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { cn } from "../utils/cn";
import type { Material, MaterialRequestStatus, MaterialStatus } from "../types";

type TabKey = "stock" | "requests" | "transit" | "history" | "categories";
const TAB_KEYS: TabKey[] = ["stock", "requests", "transit", "history", "categories"];

const PAGE_SIZE = 10;

export default function BrigadirMaterialsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { strings } = useLanguage();
  const s = strings.brigadirMaterials;
  const [searchParams, setSearchParams] = useSearchParams();

  const materials = useRepositorySnapshot(materialsRepository);
  const receipts = useRepositorySnapshot(materialReceiptsRepository);
  const writeOffs = useRepositorySnapshot(materialWriteOffsRepository);
  const transfers = useRepositorySnapshot(materialTransfersRepository);
  const employees = useRepositorySnapshot(employeesRepository);
  const [requests, setRequests] = useRepositoryState(materialRequestsRepository);

  const currentEmployee = useMemo(
    () => employees.find((e) => e.id === user?.employeeId) ?? null,
    [employees, user],
  );

  const TABS: { key: TabKey; label: string }[] = [
    { key: "stock", label: s.tabStock },
    { key: "requests", label: s.tabRequests },
    { key: "transit", label: s.tabTransit },
    { key: "history", label: s.tabHistory },
    { key: "categories", label: s.tabCategories },
  ];

  const STATUS_FILTER_OPTIONS: { value: MaterialStatus | "all"; label: string }[] = [
    { value: "all", label: s.allStatusesOption },
    { value: "normal", label: s.statusNormal },
    { value: "low", label: s.statusLow },
    { value: "critical", label: s.statusCritical },
  ];

  const REQUEST_STATUS_OPTIONS: { value: MaterialRequestStatus | "all"; label: string }[] = [
    { value: "all", label: s.allStatusesOption },
    { value: "new", label: s.requestStatusNew },
    { value: "approved", label: s.requestStatusApproved },
    { value: "in_transit", label: s.requestStatusInTransit },
    { value: "issued", label: s.requestStatusIssued },
    { value: "rejected", label: s.requestStatusRejected },
  ];

  const rawTab = searchParams.get("tab");
  const tab: TabKey = TAB_KEYS.includes(rawTab as TabKey) ? (rawTab as TabKey) : "stock";

  function setTab(next: TabKey) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  // -- Stock tab state --------------------------------------------------
  const [search, setSearch] = usePersistentState("filters.brigadirMaterials.search", "");
  const [category, setCategory] = usePersistentState("filters.brigadirMaterials.category", "all");
  const [stockStatusFilter, setStockStatusFilter] = useState<MaterialStatus | "all">("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(PAGE_SIZE);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // -- Requests tab state -------------------------------------------------
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState<MaterialRequestStatus | "all">("all");
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState(PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);

  // -- History tab state ----------------------------------------------------
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(PAGE_SIZE);

  const kpis = useMemo(() => computeMaterialKpis(materials), [materials]);

  const inTransitTransfers = useMemo(() => transfers.filter((t) => t.status === "in_transit"), [transfers]);
  const inTransitMaterialCount = useMemo(
    () => new Set(inTransitTransfers.flatMap((t) => t.lines.map((l) => l.materialName))).size,
    [inTransitTransfers],
  );

  const attentionMaterials = useMemo(
    () => materials.filter((m) => getMaterialStatus(m) !== "normal"),
    [materials],
  );

  // Four mutually exclusive buckets for the donut: getMaterialStatus() only distinguishes
  // normal/low/critical, so "out of stock" is carved out of the critical bucket by quantity.
  const stockStatusBreakdown = useMemo(() => {
    const outOfStock = materials.filter((m) => m.stock <= 0).length;
    const critical = materials.filter((m) => m.stock > 0 && getMaterialStatus(m) === "critical").length;
    const low = materials.filter((m) => getMaterialStatus(m) === "low").length;
    const normal = materials.filter((m) => getMaterialStatus(m) === "normal").length;
    const total = materials.length || 1;
    return { normal, low, critical, outOfStock, total };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (query && !`${m.name} ${m.category}`.toLowerCase().includes(query)) return false;
      if (category !== "all" && m.category !== category) return false;
      if (stockStatusFilter !== "all" && getMaterialStatus(m) !== stockStatusFilter) return false;
      if (attentionOnly && getMaterialStatus(m) === "normal") return false;
      return true;
    });
  }, [materials, search, category, stockStatusFilter, attentionOnly]);

  const stockPageCount = Math.max(1, Math.ceil(filteredMaterials.length / stockPageSize));
  const stockCurrentPage = Math.min(stockPage, stockPageCount);
  const stockRows = filteredMaterials.slice((stockCurrentPage - 1) * stockPageSize, stockCurrentPage * stockPageSize);

  const categorySummary = useMemo(() => {
    const map = new Map<string, { category: string; count: number; totalStock: number; totalValue: number }>();
    for (const m of materials) {
      const entry = map.get(m.category) ?? { category: m.category, count: 0, totalStock: 0, totalValue: 0 };
      entry.count += 1;
      entry.totalStock += m.stock;
      entry.totalValue += getMaterialTotalValue(m);
      map.set(m.category, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [materials]);

  const sortedRequests = useMemo(() => [...requests].sort((a, b) => (a.date < b.date ? 1 : -1)), [requests]);
  const latestRequests = sortedRequests.slice(0, 5);

  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    return sortedRequests.filter((r) => {
      if (query && !`${r.materialName} ${r.documentNumber}`.toLowerCase().includes(query)) return false;
      if (requestStatus !== "all" && r.status !== requestStatus) return false;
      return true;
    });
  }, [sortedRequests, requestSearch, requestStatus]);

  const requestPageCount = Math.max(1, Math.ceil(filteredRequests.length / requestPageSize));
  const requestCurrentPage = Math.min(requestPage, requestPageCount);
  const requestRows = filteredRequests.slice((requestCurrentPage - 1) * requestPageSize, requestCurrentPage * requestPageSize);

  const historyEntries = useMemo(() => {
    type Entry = {
      id: string;
      tone: "green" | "red" | "blue";
      icon: typeof TrendingUp;
      title: string;
      value: string;
      date: string;
      responsibleName: string;
    };
    const fromReceipts: Entry[] = receipts.flatMap((r) =>
      r.lines.map((l, i) => ({
        id: `receipt-${r.id}-${i}`,
        tone: "green" as const,
        icon: TrendingUp,
        title: s.receivedLabel(l.materialName),
        value: `+${formatNumber(l.quantity)} ${l.unit}`,
        date: r.date,
        responsibleName: responsiblePersonName(r.responsible, employees),
      })),
    );
    const fromWriteOffs: Entry[] = writeOffs.flatMap((w) =>
      w.lines.map((l, i) => ({
        id: `writeoff-${w.id}-${i}`,
        tone: "red" as const,
        icon: TrendingDown,
        title: s.writtenOffLabel(l.materialName),
        value: `-${formatNumber(l.quantity)} ${l.unit}`,
        date: w.date,
        responsibleName: responsiblePersonName(w.responsible, employees),
      })),
    );
    const fromTransfers: Entry[] = transfers.map((t) => ({
      id: `transfer-${t.id}`,
      tone: "blue" as const,
      icon: ArrowLeftRight,
      title: s.movedLabel(t.fromWarehouse, t.toWarehouse),
      value: `${formatNumber(transferQuantity(t))} ${s.unitsShortLabel}`,
      date: t.date,
      responsibleName: responsiblePersonName(t.responsible, employees),
    }));
    return [...fromReceipts, ...fromWriteOffs, ...fromTransfers].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [receipts, writeOffs, transfers, employees, s]);

  const historyPageCount = Math.max(1, Math.ceil(historyEntries.length / historyPageSize));
  const historyCurrentPage = Math.min(historyPage, historyPageCount);
  const historyRows = historyEntries.slice((historyCurrentPage - 1) * historyPageSize, historyCurrentPage * historyPageSize);

  function handleAttentionClick() {
    setTab("stock");
    setAttentionOnly(true);
    setStockPage(1);
  }

  function handleExport() {
    const header = [s.colMaterial, s.colCategory, s.colUnit, s.colStock, s.colMinStock, s.colStatus];
    const statusLabel: Record<MaterialStatus, string> = { normal: s.statusNormal, low: s.statusLow, critical: s.statusCritical };
    const rows = filteredMaterials.map((m) => [m.name, m.category, m.unit, m.stock, m.minStock, statusLabel[getMaterialStatus(m)]]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "materialy.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast(s.exportedToast);
  }

  function handleCreateRequest(input: { materialName: string; unit: string; quantity: number; note: string }) {
    const nextNumber = requests.length > 0 ? Math.max(...requests.map((r) => r.number)) + 1 : 1;
    const today = new Date().toISOString().slice(0, 10);
    setRequests((prev) => [
      {
        id: `req-${Date.now()}`,
        number: nextNumber,
        documentNumber: `3-${new Date().getFullYear()}-${String(nextNumber).padStart(3, "0")}`,
        date: today,
        materialName: input.materialName,
        quantity: input.quantity,
        unit: input.unit,
        objectName: currentEmployee?.objectName ?? "—",
        brigadeName: currentEmployee?.brigadeName ?? "—",
        requestedBy: user?.fullName ?? "—",
        status: "new",
        note: input.note,
        createdDate: new Date().toISOString(),
        createdBy: user?.fullName ?? "—",
      },
      ...prev,
    ]);
    setFormOpen(false);
    showToast(s.requestCreatedToast);
  }

  const statusLabel: Record<MaterialStatus, string> = { normal: s.statusNormal, low: s.statusLow, critical: s.statusCritical };

  return (
    <AppLayout
      title={s.pageTitle}
      subtitle={s.pageSubtitle}
      titleBelowHeader
      contentMaxWidth="1600px"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setStockPage(1);
          setTab("stock");
        },
        placeholder: s.searchMaterialPlaceholder,
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={s.kpiTotalMaterials} value={String(kpis.totalCount)} icon={Package} tone="orange" footer={s.kpiTotalMaterialsFooter} />
        <MetricCard label={s.kpiTotalStock} value={formatNumber(Math.round(kpis.totalStock))} icon={Boxes} tone="green" footer={s.kpiTotalStockFooter} />
        <MetricCard label={s.kpiInTransit} value={String(inTransitMaterialCount)} icon={Truck} tone="blue" footer={s.kpiInTransitFooter} />
        <MetricCard label={s.kpiLowStock} value={String(attentionMaterials.length)} icon={CircleAlert} tone="orange" footer={s.kpiLowStockFooter} />
        <MetricCard label={s.kpiRequestsPeriod} value={String(requests.length)} icon={ClipboardList} tone="purple" footer={s.kpiRequestsPeriodFooter} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex overflow-x-auto px-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "relative whitespace-nowrap px-4 py-3.5 text-sm font-semibold transition-colors",
                tab === t.key ? "text-primary" : "text-ink-secondary hover:text-ink",
              )}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.65fr_1fr]">
        <Card className="min-w-0 overflow-hidden">
          {tab === "stock" && (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <label className="flex h-10 min-w-[180px] flex-1 items-center gap-2 rounded-[10px] border border-border-strong px-3.5">
                  <Search size={16} className="shrink-0 text-ink-muted" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setStockPage(1);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
                    placeholder={s.searchMaterialPlaceholder}
                  />
                </label>
                <div className="min-w-[150px]">
                  <CustomSelect
                    searchable
                    value={category}
                    onValueChange={(v) => {
                      setCategory(v);
                      setStockPage(1);
                    }}
                    options={[{ value: "all", label: s.allCategoriesOption }, ...MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))]}
                  />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setFilterOpen((v) => !v)}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-medium transition-colors",
                      stockStatusFilter !== "all"
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border-strong text-ink-secondary hover:bg-surface-3",
                    )}
                  >
                    <Filter size={15} /> {s.filterButton}
                  </button>
                  {filterOpen && (
                    <>
                      {/* Backdrop (not useOnClickOutside): the status CustomSelect below portals its
                          option list to document.body, outside this popover's DOM subtree. A mousedown
                          listener would treat clicking an option as "outside" and unmount the popover
                          (and its portal) before the option's click can register the selection. A
                          backdrop only reacts to clicks that land on itself, so portaled clicks pass through. */}
                      <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                      <div className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-3.5 shadow-[var(--shadow-popover)]">
                        <p className="text-xs font-semibold text-ink-secondary">{s.filterStatusLabel}</p>
                        <div className="mt-1.5">
                          <CustomSelect
                            value={stockStatusFilter}
                            onValueChange={(v) => {
                              setStockStatusFilter(v as MaterialStatus | "all");
                              setStockPage(1);
                            }}
                            options={STATUS_FILTER_OPTIONS}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => {
                            setStockPage(1);
                            setFilterOpen(false);
                          }}
                        >
                          {s.applyFilterButton}
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {attentionOnly && (
                  <button
                    type="button"
                    onClick={() => setAttentionOnly(false)}
                    className="flex h-10 items-center gap-1.5 rounded-[10px] border border-primary bg-primary-soft px-3 text-xs font-semibold text-primary"
                  >
                    {s.lowStockOnlyChip} <X size={13} />
                  </button>
                )}
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download size={14} /> {s.exportButton}
                </Button>
              </div>

              {stockRows.length > 0 ? (
                <>
                  {/* Desktop / tablet table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[720px] text-left">
                      <thead className="bg-surface-2 text-xs font-semibold text-ink-secondary">
                        <tr>
                          <th className="px-4 py-3">{s.colMaterial}</th>
                          <th className="px-2 py-3">{s.colCategory}</th>
                          <th className="px-2 py-3">{s.colUnit}</th>
                          <th className="px-2 py-3">{s.colStock}</th>
                          <th className="px-2 py-3">{s.colMinStock}</th>
                          <th className="px-2 py-3">{s.colStatus}</th>
                          <th className="px-4 py-3 text-right">{s.colAction}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stockRows.map((m) => (
                          <tr key={m.id} className="text-sm hover:bg-surface-1">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <MaterialThumbnail src={m.imageUrl} alt={m.name} className="h-9 w-9 shrink-0" />
                                <span className="min-w-0 truncate font-semibold text-ink">{m.name}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 whitespace-nowrap text-ink-secondary">{m.category}</td>
                            <td className="px-2 py-2.5 whitespace-nowrap text-ink-secondary">{m.unit}</td>
                            <td className="px-2 py-2.5 tabular font-semibold text-ink">{formatNumber(m.stock)}</td>
                            <td className="px-2 py-2.5 tabular text-ink-secondary">{formatNumber(m.minStock)}</td>
                            <td className="px-2 py-2.5">
                              <MaterialStatusBadge status={getMaterialStatus(m)} label={statusLabel[getMaterialStatus(m)]} />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => setViewMaterial(m)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
                              >
                                <Eye size={13} /> {s.detailsButton}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="divide-y divide-border md:hidden">
                    {stockRows.map((m) => (
                      <div key={m.id} className="flex items-start gap-3 p-4">
                        <MaterialThumbnail src={m.imageUrl} alt={m.name} className="h-12 w-12 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 truncate font-semibold text-ink">{m.name}</p>
                            <MaterialStatusBadge status={getMaterialStatus(m)} label={statusLabel[getMaterialStatus(m)]} />
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">{m.category}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
                            <span>
                              {s.colStock}: <b className="tabular text-ink">{formatNumber(m.stock)} {m.unit}</b>
                            </span>
                            <span>
                              {s.colMinStock}: <b className="tabular text-ink">{formatNumber(m.minStock)} {m.unit}</b>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewMaterial(m)}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink"
                          >
                            <Eye size={13} /> {s.detailsButton}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon={Package} title={s.emptyMaterialsTitle} description={s.emptyMaterialsDescription} />
              )}

              <Pagination
                page={stockCurrentPage}
                pageCount={stockPageCount}
                pageSize={stockPageSize}
                total={filteredMaterials.length}
                onPageChange={setStockPage}
                onPageSizeChange={(size) => {
                  setStockPageSize(size);
                  setStockPage(1);
                }}
                itemLabel={s.paginationMaterialsLabel}
              />
            </>
          )}

          {tab === "requests" && (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <label className="flex h-10 min-w-[180px] flex-1 items-center gap-2 rounded-[10px] border border-border-strong px-3.5">
                  <Search size={16} className="shrink-0 text-ink-muted" />
                  <input
                    value={requestSearch}
                    onChange={(e) => {
                      setRequestSearch(e.target.value);
                      setRequestPage(1);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
                    placeholder={s.searchRequestPlaceholder}
                  />
                </label>
                <div className="min-w-[150px]">
                  <CustomSelect
                    value={requestStatus}
                    onValueChange={(v) => {
                      setRequestStatus(v as MaterialRequestStatus | "all");
                      setRequestPage(1);
                    }}
                    options={REQUEST_STATUS_OPTIONS}
                  />
                </div>
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <PlusCircle size={14} /> {s.createRequestButton}
                </Button>
              </div>

              {requestRows.length > 0 ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[640px] text-left">
                      <thead className="bg-surface-2 text-xs font-semibold text-ink-secondary">
                        <tr>
                          <th className="px-4 py-3">{s.colRequestNumber}</th>
                          <th className="px-2 py-3">{s.colRequestMaterial}</th>
                          <th className="px-2 py-3">{s.colRequestQuantity}</th>
                          <th className="px-2 py-3">{s.colRequestDate}</th>
                          <th className="px-4 py-3">{s.colRequestStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {requestRows.map((r) => (
                          <tr key={r.id} className="text-sm hover:bg-surface-1">
                            <td className="px-4 py-2.5 font-semibold text-ink">№ {r.documentNumber}</td>
                            <td className="px-2 py-2.5 text-ink">{r.materialName}</td>
                            <td className="px-2 py-2.5 tabular text-ink-secondary">
                              {formatNumber(r.quantity)} {r.unit}
                            </td>
                            <td className="px-2 py-2.5 whitespace-nowrap text-ink-secondary">{formatDateShort(r.date)}</td>
                            <td className="px-4 py-2.5">
                              <MaterialRequestStatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-border md:hidden">
                    {requestRows.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">№ {r.documentNumber}</p>
                          <p className="truncate text-xs text-ink-muted">{r.materialName}</p>
                          <p className="mt-1 text-xs text-ink-secondary">
                            {formatNumber(r.quantity)} {r.unit} · {formatDateShort(r.date)}
                          </p>
                        </div>
                        <MaterialRequestStatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title={s.emptyRequestsTitle}
                  description={s.emptyRequestsDescription}
                  action={
                    <Button size="sm" onClick={() => setFormOpen(true)}>
                      <PlusCircle size={14} /> {s.createRequestButton}
                    </Button>
                  }
                />
              )}

              <Pagination
                page={requestCurrentPage}
                pageCount={requestPageCount}
                pageSize={requestPageSize}
                total={filteredRequests.length}
                onPageChange={setRequestPage}
                onPageSizeChange={(size) => {
                  setRequestPageSize(size);
                  setRequestPage(1);
                }}
                itemLabel={s.paginationRequestsLabel}
              />
            </>
          )}

          {tab === "transit" && (
            <>
              {inTransitTransfers.length > 0 ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[680px] text-left">
                      <thead className="bg-surface-2 text-xs font-semibold text-ink-secondary">
                        <tr>
                          <th className="px-4 py-3">{s.colTransitDocument}</th>
                          <th className="px-2 py-3">{s.colTransitMaterials}</th>
                          <th className="px-2 py-3">{s.colTransitRoute}</th>
                          <th className="px-2 py-3">{s.colTransitDate}</th>
                          <th className="px-4 py-3">{s.colTransitStatus}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {inTransitTransfers.map((t) => (
                          <tr key={t.id} className="text-sm hover:bg-surface-1">
                            <td className="px-4 py-2.5 font-semibold text-ink">{t.documentNumber}</td>
                            <td className="px-2 py-2.5 text-ink-secondary">
                              {t.lines.map((l) => l.materialName).join(", ")} · {formatNumber(transferQuantity(t))} {s.unitsShortLabel}
                            </td>
                            <td className="px-2 py-2.5 whitespace-nowrap text-ink-secondary">
                              {t.fromWarehouse} → {t.toWarehouse}
                            </td>
                            <td className="px-2 py-2.5 whitespace-nowrap text-ink-secondary">{formatDateShort(t.date)}</td>
                            <td className="px-4 py-2.5">
                              <TransferStatusBadge status={t.status} label={s.requestStatusInTransit} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-border md:hidden">
                    {inTransitTransfers.map((t) => (
                      <div key={t.id} className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-ink">{t.documentNumber}</p>
                          <TransferStatusBadge status={t.status} label={s.requestStatusInTransit} />
                        </div>
                        <p className="mt-1 text-xs text-ink-secondary">{t.lines.map((l) => l.materialName).join(", ")}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {t.fromWarehouse} → {t.toWarehouse} · {formatDateShort(t.date)}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon={Truck} title={s.emptyTransitTitle} description={s.emptyTransitDescription} />
              )}
            </>
          )}

          {tab === "history" && (
            <>
              {historyRows.length > 0 ? (
                <div className="divide-y divide-border px-4">
                  {historyRows.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 py-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          entry.tone === "green" && "bg-green-soft text-green",
                          entry.tone === "red" && "bg-red-soft text-red",
                          entry.tone === "blue" && "bg-blue-soft text-blue",
                        )}
                      >
                        <entry.icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Avatar name={entry.responsibleName} size="sm" className="h-4 w-4 text-[8px]" />
                          <p className="truncate text-xs text-ink-muted">
                            {entry.responsibleName} · {formatDateShort(entry.date)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular",
                          entry.tone === "green" && "text-green",
                          entry.tone === "red" && "text-red",
                          entry.tone === "blue" && "text-blue",
                        )}
                      >
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={ArrowLeftRight} title={s.emptyHistoryTitle} />
              )}

              <Pagination
                page={historyCurrentPage}
                pageCount={historyPageCount}
                pageSize={historyPageSize}
                total={historyEntries.length}
                onPageChange={setHistoryPage}
                onPageSizeChange={(size) => {
                  setHistoryPageSize(size);
                  setHistoryPage(1);
                }}
                itemLabel={s.paginationHistoryLabel}
              />
            </>
          )}

          {tab === "categories" && (
            <div className="divide-y divide-border">
              {categorySummary.map((row) => (
                <div key={row.category} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{row.category}</p>
                    <p className="text-xs text-ink-muted">{s.categoryItemsLabel(row.count)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-ink">
                      {formatNumber(Math.round(row.totalStock * 10) / 10)} {s.unitsShortLabel}
                    </p>
                    <p className="tabular text-xs text-ink-muted">
                      {formatNumber(Math.round(row.totalValue))} {s.somoniLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <h2 className="text-base font-bold text-ink">{s.warehouseStatusTitle}</h2>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div
                className="relative h-[120px] w-[120px] shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    var(--color-green) 0 ${(stockStatusBreakdown.normal / stockStatusBreakdown.total) * 100}%,
                    var(--color-warning) ${(stockStatusBreakdown.normal / stockStatusBreakdown.total) * 100}% ${((stockStatusBreakdown.normal + stockStatusBreakdown.low) / stockStatusBreakdown.total) * 100}%,
                    var(--color-red) ${((stockStatusBreakdown.normal + stockStatusBreakdown.low) / stockStatusBreakdown.total) * 100}% ${((stockStatusBreakdown.normal + stockStatusBreakdown.low + stockStatusBreakdown.critical) / stockStatusBreakdown.total) * 100}%,
                    var(--color-border-strong) ${((stockStatusBreakdown.normal + stockStatusBreakdown.low + stockStatusBreakdown.critical) / stockStatusBreakdown.total) * 100}% 100%
                  )`,
                }}
              >
                <div className="absolute inset-[16px] flex items-center justify-center rounded-full bg-card text-center">
                  <div>
                    <b className="block text-lg text-ink">{stockStatusBreakdown.total}</b>
                    <span className="text-[10px] text-ink-muted">{s.totalLabel}</span>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                {[
                  ["bg-green", s.statusNormal, stockStatusBreakdown.normal],
                  ["bg-warning", s.statusLow, stockStatusBreakdown.low],
                  ["bg-red", s.statusCritical, stockStatusBreakdown.critical],
                  ["bg-[color:var(--color-border-strong)]", s.statusOutOfStock, stockStatusBreakdown.outOfStock],
                ].map(([dot, label, value]) => (
                  <div key={label as string} className="flex items-center gap-2 text-xs">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", dot as string)} />
                    <span className="flex-1 text-ink-secondary">{label}</span>
                    <b className="text-ink">
                      {value} ({Math.round((Number(value) / stockStatusBreakdown.total) * 100)}%)
                    </b>
                  </div>
                ))}
              </div>
            </div>
            {attentionMaterials.length > 0 && (
              <button
                type="button"
                onClick={handleAttentionClick}
                className="mt-4 flex w-full items-center gap-3 rounded-[10px] border border-primary/30 bg-primary-soft p-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/40 text-primary">
                  <ClipboardList size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-ink">{s.attentionBanner(attentionMaterials.length)}</b>
                  <span className="text-xs text-ink-muted">{s.attentionBannerHint}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-muted" />
              </button>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-base font-bold text-ink">{s.recentRequestsTitle}</h2>
              <button type="button" onClick={() => setTab("requests")} className="text-xs font-semibold text-primary">
                {s.allRequestsLink}
              </button>
            </div>
            {latestRequests.length > 0 ? (
              <div className="divide-y divide-border px-5">
                {latestRequests.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-secondary">
                      <Package size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-xs text-ink">№ {r.documentNumber}</b>
                      <span className="block truncate text-xs text-ink-muted">{r.materialName}</span>
                    </span>
                    <MaterialRequestStatusBadge status={r.status} />
                    <span className="w-[64px] shrink-0 text-right text-xs text-ink-muted">{formatDateShort(r.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 pb-4 text-sm text-ink-muted">{s.noRequestsYet}</p>
            )}
            <div className="p-5 pt-3">
              <Button variant="outline" className="w-full" onClick={() => setFormOpen(true)}>
                <PlusCircle size={15} /> {s.createRequestButton}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <MaterialDetailDrawer material={viewMaterial} onClose={() => setViewMaterial(null)} />
      <MaterialRequestFormModal open={formOpen} materials={materials} onClose={() => setFormOpen(false)} onSubmit={handleCreateRequest} />
    </AppLayout>
  );
}
