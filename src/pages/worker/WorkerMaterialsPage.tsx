import { useMemo, useState } from "react";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { materialsRepository, materialReceiptsRepository, materialRequestsRepository, stockReservationsRepository } from "../../data/repositories";
import { MATERIAL_CATEGORIES } from "../../data/mockMaterials";
import { buildStockRows } from "../../utils/stockAnalytics";
import {
  buildWorkerMaterialRows,
  computeCategoryStock,
  computeWorkerMaterialsKpis,
  filterWorkerMaterialRows,
  type WorkerMaterialRow,
} from "../../utils/workerMaterialsAnalytics";
import { WorkerMaterialsStats } from "../../components/worker/materials/WorkerMaterialsStats";
import { WorkerMaterialsFilters, DEFAULT_MATERIALS_FILTERS, type WorkerMaterialsFiltersState } from "../../components/worker/materials/WorkerMaterialsFilters";
import { WorkerMaterialsTable } from "../../components/worker/materials/WorkerMaterialsTable";
import { WorkerMaterialRequestCard } from "../../components/worker/materials/WorkerMaterialRequestCard";
import { WorkerCategoryStockCard } from "../../components/worker/materials/WorkerCategoryStockCard";
import { WorkerRecentRequestsCard } from "../../components/worker/materials/WorkerRecentRequestsCard";
import { WorkerMaterialRequestsTable } from "../../components/worker/materials/WorkerMaterialRequestsTable";
import { cn } from "../../utils/cn";

type MaterialsTab = "available" | "myRequests" | "history";

export default function WorkerMaterialsPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { brigade } = useWorkerScope(user);

  const materials = useRepositorySnapshot(materialsRepository);
  const reservations = useRepositorySnapshot(stockReservationsRepository);
  const receipts = useRepositorySnapshot(materialReceiptsRepository);
  const allRequests = useRepositorySnapshot(materialRequestsRepository);

  const [tab, setTab] = useState<MaterialsTab>("available");
  const [filters, setFilters] = useState<WorkerMaterialsFiltersState>(DEFAULT_MATERIALS_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const stockRows = useMemo(() => buildStockRows(materials, reservations), [materials, reservations]);
  const materialRows = useMemo(() => buildWorkerMaterialRows(materials, reservations), [materials, reservations]);
  const filteredRows = useMemo(() => filterWorkerMaterialRows(materialRows, filters), [materialRows, filters]);
  const kpis = useMemo(() => computeWorkerMaterialsKpis(stockRows, receipts), [stockRows, receipts]);
  const categoryStock = useMemo(() => computeCategoryStock(materials), [materials]);
  const units = useMemo(() => Array.from(new Set(materials.map((m) => m.unit))).sort((a, b) => a.localeCompare(b, "ru")), [materials]);

  const myRequests = useMemo(
    () => (brigade ? allRequests.filter((r) => r.brigadeName === brigade.name).sort((a, b) => (a.date < b.date ? 1 : -1)) : []),
    [allRequests, brigade],
  );
  const activeRequests = useMemo(() => myRequests.filter((r) => r.status === "new" || r.status === "approved" || r.status === "in_transit"), [myRequests]);
  const historyRequests = useMemo(() => myRequests.filter((r) => r.status === "issued" || r.status === "rejected"), [myRequests]);

  function handleFiltersChange(next: WorkerMaterialsFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function handleSelectMaterial(row: WorkerMaterialRow) {
    setSelectedMaterialId(row.id);
  }

  const tabs: { key: MaterialsTab; label: string }[] = [
    { key: "available", label: s.materialsTabAvailable },
    { key: "myRequests", label: s.materialsTabMyRequests },
    { key: "history", label: s.materialsTabHistory },
  ];

  return (
    <AppLayout title={s.materialsPageTitle} subtitle={s.materialsPageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      <div className="space-y-4">
        <WorkerMaterialsStats kpis={kpis} />

        <div className="flex items-center gap-5 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-0.5 pb-3 text-sm font-semibold transition-colors",
                tab === t.key ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {tab === "available" && (
              <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="p-4">
                  <WorkerMaterialsFilters value={filters} onChange={handleFiltersChange} categories={MATERIAL_CATEGORIES} units={units} />
                </div>
                <WorkerMaterialsTable
                  rows={filteredRows}
                  page={page}
                  onPageChange={setPage}
                  selectedMaterialId={selectedMaterialId}
                  onSelectMaterial={handleSelectMaterial}
                  onResetFilters={() => handleFiltersChange(DEFAULT_MATERIALS_FILTERS)}
                />
              </div>
            )}
            {tab === "myRequests" && <WorkerMaterialRequestsTable requests={activeRequests} emptyLabel={s.emptyMaterialRequests} />}
            {tab === "history" && <WorkerMaterialRequestsTable requests={historyRequests} emptyLabel={s.emptyMaterialRequestsHistory} />}
          </div>

          <div className="min-w-0 space-y-4">
            <WorkerMaterialRequestCard materials={materials} selectedMaterialId={selectedMaterialId} onSubmitted={() => setSelectedMaterialId(null)} />
            <WorkerCategoryStockCard rows={categoryStock} />
            <WorkerRecentRequestsCard requests={myRequests} onViewAll={() => setTab("myRequests")} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
