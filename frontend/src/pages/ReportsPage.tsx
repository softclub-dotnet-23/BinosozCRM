import { useMemo } from "react";
import { AlertCircle, Banknote, Building2, ClipboardCheck, HardHat } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { useObjects, useObjectCostBreakdown } from "../hooks/api/useObjects";
import { useDashboardWorkStatus } from "../hooks/api/useDashboard";
import { usePayroll } from "../hooks/api/usePayroll";
import { useBrigades } from "../hooks/api/useBrigades";
import { useWorkers } from "../hooks/api/useWorkers";
import { useAuth } from "../context/AuthContext";
import { normalizeApiError } from "../services/apiError";
import { PAYROLL_ENTRY_STATUS_LABEL, PayrollEntryStatus } from "../services/types";
import { formatCurrency } from "../utils/format";
import type { ConstructionObjectDto } from "../services/objectsApi";
import BrigadirReportsPage from "./BrigadirReportsPage";

/**
 * Composed entirely from endpoints other pages already use for their own primary purpose
 * (dashboard/work-status, objects/{id}/cost-breakdown, payroll, brigades, workers) — no backend
 * aggregate endpoint exists specifically for "reports", and no daily/historical time-series or
 * per-responsible-person breakdown is available (nothing in the domain stores that), so this
 * reports page is a same-page rollup of current-state numbers, not a trend dashboard. The
 * previous version's "Склад" (warehouse) tab is gone entirely — no material inventory domain
 * exists in the real backend (Objects §5 has no warehouse/stock entities).
 */
export default function ReportsPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirReportsPage />;
  return <CompanyReports />;
}

function CompanyReports() {
  const { data: objectsData, isLoading: objectsLoading, isError: objectsError, error: objectsErrorObj } = useObjects({ page: 1, pageSize: 200 });
  const { data: workStatus, isLoading: workStatusLoading, isError: workStatusError } = useDashboardWorkStatus();
  const { data: payrollData } = usePayroll({ page: 1, pageSize: 200 });
  const { data: brigadesData } = useBrigades({ page: 1, pageSize: 200 });
  const { data: workersData } = useWorkers({ page: 1, pageSize: 500 });

  const objects = objectsData?.items ?? [];
  const budgetedObjects = objects.filter((o) => o.budget !== null);
  const payrollEntries = payrollData?.items ?? [];
  const brigades = brigadesData?.items ?? [];
  const workers = workersData?.items ?? [];

  const payrollByStatus = useMemo(() => {
    const buckets = new Map<PayrollEntryStatus, { count: number; amount: number }>();
    for (const entry of payrollEntries) {
      const current = buckets.get(entry.status) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += entry.finalAmount ?? entry.calculatedAmount;
      buckets.set(entry.status, current);
    }
    return buckets;
  }, [payrollEntries]);

  return (
    <AppLayout title="Отчёты" subtitle="Сводка по объектам, нарядам, зарплате и бригадам">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Объектов" value={String(objects.length)} icon={Building2} tone="blue" />
        <MetricCard label="Бригад" value={String(brigades.length)} icon={HardHat} tone="purple" />
        <MetricCard label="Сотрудников" value={String(workers.filter((w) => w.isActive).length)} icon={ClipboardCheck} tone="green" />
        <MetricCard
          label="Начислено зарплаты"
          value={formatCurrency(payrollEntries.reduce((sum, p) => sum + (p.finalAmount ?? p.calculatedAmount), 0))}
          icon={Banknote}
          tone="orange"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">Статусы нарядов и задач</h2>
          {workStatusLoading ? (
            <p className="mt-3 text-sm text-ink-secondary">Загрузка...</p>
          ) : workStatusError ? (
            <p className="mt-3 text-sm text-red">Недоступно для вашей роли или произошла ошибка</p>
          ) : workStatus ? (
            <div className="mt-4 space-y-4">
              <StatusBreakdown title="Наряды" rows={workStatus.workOrderStatusCounts} overdue={workStatus.overdueWorkOrderCount} />
              <StatusBreakdown title="Индивидуальные задачи" rows={workStatus.individualTaskStatusCounts} overdue={workStatus.overdueIndividualTaskCount} />
            </div>
          ) : null}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">Зарплата по статусам</h2>
          {payrollEntries.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Нет данных по зарплате</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {Object.entries(PAYROLL_ENTRY_STATUS_LABEL).map(([value, label]) => {
                const bucket = payrollByStatus.get(Number(value) as PayrollEntryStatus);
                return (
                  <div key={value} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                    <span className="text-ink-secondary">{label}</span>
                    <span className="tabular font-semibold text-ink">{bucket ? `${formatCurrency(bucket.amount)} · ${bucket.count}` : "—"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink">Бюджет по объектам</h2>
        {objectsLoading ? (
          <p className="mt-3 text-sm text-ink-secondary">Загрузка...</p>
        ) : objectsError ? (
          <EmptyState icon={AlertCircle} title="Не удалось загрузить объекты" description={normalizeApiError(objectsErrorObj).message} />
        ) : budgetedObjects.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">Нет объектов с указанным бюджетом</p>
        ) : (
          <div className="mt-4 space-y-2">
            {budgetedObjects.map((o) => <ObjectBudgetRow key={o.id} object={o} />)}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}

function StatusBreakdown({ title, rows, overdue }: { title: string; rows: { status: string; count: number }[]; overdue: number }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {overdue > 0 && <Badge tone="red">{overdue} просрочено</Badge>}
      </div>
      {total === 0 ? (
        <p className="mt-1.5 text-xs text-ink-muted">Нет данных</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <div key={r.status} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 text-ink-secondary">{r.status}</span>
              <div className="h-2 flex-1 rounded-full bg-surface-2">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right tabular font-semibold text-ink">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectBudgetRow({ object }: { object: ConstructionObjectDto }) {
  const { data, isLoading } = useObjectCostBreakdown(object.id);
  const budget = object.budget ?? 0;
  const actual = data?.totalCost ?? 0;
  const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
  const overBudget = budget > 0 && actual > budget;

  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-sm font-medium text-ink">{object.name}</span>
      <div className="h-2 flex-1 rounded-full bg-surface-2">
        <div className={`h-2 rounded-full ${overBudget ? "bg-red" : "bg-green"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-40 shrink-0 text-right text-xs tabular text-ink-secondary">
        {isLoading ? "…" : `${formatCurrency(actual)} / ${formatCurrency(budget)}`}
      </span>
    </div>
  );
}
