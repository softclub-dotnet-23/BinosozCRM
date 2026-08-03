import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Banknote, Building2, ClipboardCheck, Loader2, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { RiskList } from "../components/tables/RiskList";
import { ObjectBudgetChart } from "../components/charts/ObjectBudgetChart";
import { useAuth } from "../context/AuthContext";
import { ApiError, NetworkError } from "../api/apiClient";
import { getDashboardWorkStatus, type DashboardWorkStatus } from "../api/dashboardApi";
import {
  getObjectBudgets,
  listObjects,
  type BackendObjectStatus,
  type ConstructionObject,
  type ObjectBudgetSummary,
} from "../api/objectsApi";
import { listBrigades, type Brigade } from "../api/brigadesApi";
import { listWorkOrders, type WorkOrder, type WorkOrderStatus } from "../api/workOrdersApi";
import { listPayrollEntries } from "../api/payrollApi";
import { formatCurrency, formatPercent } from "../utils/format";
import type { RiskItem } from "../types";
import BrigadirDashboardPage from "./BrigadirDashboardPage";
import WorkerDashboardPage from "./WorkerDashboardPage";

function describeError(error: unknown, fallback: string): string {
  if (error instanceof NetworkError) return "Не удалось подключиться к серверу";
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  New: "Новый", Assigned: "Назначен", InProgress: "Выполняется", OnReview: "На проверке", Accepted: "Принят", Rejected: "Отклонён", Closed: "Закрыт",
};

const OBJECT_STATUS_LABEL: Record<BackendObjectStatus, string> = {
  Planned: "Планируется", InProgress: "В работе", Suspended: "Приостановлен", Completed: "Завершён", Closed: "Закрыт",
};
const OBJECT_STATUS_TONE: Record<BackendObjectStatus, "blue" | "green" | "orange" | "purple" | "red"> = {
  Planned: "blue", InProgress: "green", Suspended: "orange", Completed: "purple", Closed: "red",
};

const DONE_WORK_ORDER_STATUSES: WorkOrderStatus[] = ["Accepted", "Closed"];
const TERMINAL_WORK_ORDER_STATUSES: WorkOrderStatus[] = ["Accepted", "Closed", "Rejected"];

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirDashboardPage />;
  if (user?.role === "worker") return <WorkerDashboardPage />;
  return <CompanyDashboardPage />;
}

function CompanyDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workStatus, setWorkStatus] = useState<DashboardWorkStatus | null>(null);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [budgets, setBudgets] = useState<ObjectBudgetSummary[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  // Prorab has no payroll access at all (MASTER: doesn't see pay rates, doesn't
  // process payroll) — fetched independently so a 403 here can never take down
  // the rest of the dashboard for them.
  const [payrollDebt, setPayrollDebt] = useState<number | null>(null);

  async function loadCore() {
    setLoadState("loading");
    try {
      const [status, objectsResult, workOrdersResult, brigadesResult, budgetSummaries] = await Promise.all([
        getDashboardWorkStatus(),
        listObjects(1, 100),
        listWorkOrders(1, 100),
        listBrigades(1, 100),
        getObjectBudgets(),
      ]);
      setWorkStatus(status);
      setObjects(objectsResult.items);
      setWorkOrders(workOrdersResult.items);
      setBrigades(brigadesResult.items);
      setBudgets(budgetSummaries);
      setLoadState("ready");
    } catch (error) {
      setLoadError(describeError(error, "Не удалось загрузить сводку"));
      setLoadState("error");
    }
  }

  async function loadPayrollDebt() {
    try {
      const result = await listPayrollEntries(1, 100);
      const debt = result.items
        .filter((entry) => entry.status !== "Paid")
        .reduce((sum, entry) => sum + (entry.finalAmount ?? entry.calculatedAmount), 0);
      setPayrollDebt(debt);
    } catch {
      // Payroll is supplementary here — the rest of the dashboard still works without it.
    }
  }

  useEffect(() => {
    void loadCore();
    if (user?.role !== "prorab") void loadPayrollDebt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const workOrderStatusTotal = useMemo(
    () => workStatus?.workOrderStatusCounts.reduce((sum, s) => sum + s.count, 0) ?? 0,
    [workStatus],
  );

  const objectNameById = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);
  const brigadeNameById = useMemo(() => new Map(brigades.map((b) => [b.id, b.name])), [brigades]);

  const objectCounts = useMemo(() => ({
    total: objects.length,
    inProgress: objects.filter((o) => o.status === "InProgress").length,
    completed: objects.filter((o) => o.status === "Completed").length,
  }), [objects]);

  const financeSummary = useMemo(() => {
    const totalBudget = budgets.reduce((sum, b) => sum + (b.budget ?? 0), 0);
    const totalActualCost = budgets.reduce((sum, b) => sum + b.actualCost, 0);
    const progress = totalBudget > 0 ? Math.min(100, Math.round((totalActualCost / totalBudget) * 100)) : 0;
    return { totalBudget, totalActualCost, progress };
  }, [budgets]);

  const workOrderCompletion = useMemo(() => {
    if (workOrders.length === 0) return 0;
    const done = workOrders.filter((w) => DONE_WORK_ORDER_STATUSES.includes(w.status)).length;
    return Math.round((done / workOrders.length) * 100);
  }, [workOrders]);

  // "Состояние объектов" — real budget/actual/status per object (no progress %,
  // no foreman: neither exists safely for this page's Owner+Prorab audience,
  // see gap analysis). Over-budget objects surfaced first.
  const objectStatusById = useMemo(() => new Map(objects.map((o) => [o.id, o.status])), [objects]);
  const objectStateRows = useMemo(
    () =>
      [...budgets]
        .sort((a, b) => (a.remaining ?? Infinity) - (b.remaining ?? Infinity))
        .slice(0, 6)
        .map((b) => ({ ...b, status: objectStatusById.get(b.objectId) })),
    [budgets, objectStatusById],
  );

  // "Требует внимания" — real overdue work orders only. Low-stock materials
  // were dropped: no par-level/threshold field exists anywhere to define "low".
  const attentionItems: RiskItem[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return workOrders
      .filter((w) => w.dueDate && !TERMINAL_WORK_ORDER_STATUSES.includes(w.status))
      .map((w) => {
        const dueDate = new Date(w.dueDate!);
        const overdueDays = Math.round((today.getTime() - dueDate.getTime()) / 86_400_000);
        return { workOrder: w, overdueDays };
      })
      .filter((x) => x.overdueDays > 0)
      .sort((a, b) => b.overdueDays - a.overdueDays)
      .slice(0, 6)
      .map(({ workOrder, overdueDays }) => ({
        id: workOrder.id,
        title: workOrder.title,
        description: `${objectNameById.get(workOrder.objectId) ?? "—"} · Бригада «${brigadeNameById.get(workOrder.brigadeId) ?? "—"}»`,
        badgeLabel: `Просрочено на ${overdueDays} дн.`,
        severity: overdueDays > 7 ? ("red" as const) : ("orange" as const),
        icon: "clock" as const,
      }));
  }, [workOrders, objectNameById, brigadeNameById]);

  const budgetChartData = useMemo(
    () =>
      [...budgets]
        .sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0))
        .slice(0, 8)
        .map((b) => ({ objectName: b.objectName, budget: b.budget ?? 0, spent: b.actualCost })),
    [budgets],
  );

  const objectColumns: DataTableColumn<(typeof objectStateRows)[number]>[] = [
    { key: "objectName", header: "Объект", render: (row) => <span className="font-semibold text-ink">{row.objectName}</span> },
    { key: "budget", header: "Бюджет", render: (row) => <span className="tabular text-ink">{row.budget != null ? formatCurrency(row.budget) : "—"}</span> },
    { key: "actualCost", header: "Факт", render: (row) => <span className="tabular text-ink-secondary">{formatCurrency(row.actualCost)}</span> },
    {
      key: "remaining",
      header: "Остаток",
      render: (row) =>
        row.remaining != null ? (
          <Badge tone={row.remaining < 0 ? "red" : "green"}>{formatCurrency(row.remaining)}</Badge>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => (row.status ? <Badge tone={OBJECT_STATUS_TONE[row.status]}>{OBJECT_STATUS_LABEL[row.status]}</Badge> : <span className="text-ink-muted">—</span>),
    },
  ];

  return (
    <AppLayout title="Обзор" subtitle="Сводка по компании">
      {loadState === "error" && (
        <Card style={{ padding: 24 }}>
          <div className="flex items-center gap-2 text-red"><AlertCircle size={18} /><span>{loadError}</span></div>
          <Button size="sm" variant="secondary" onClick={() => void loadCore()} style={{ marginTop: 12 }}>Повторить</Button>
        </Card>
      )}

      {loadState === "loading" && (
        <Card style={{ padding: 40, textAlign: "center" }}><Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} /></Card>
      )}

      {loadState === "ready" && workStatus && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Бюджет"
              value={formatCurrency(financeSummary.totalBudget)}
              icon={Wallet}
              tone="orange"
              progress={financeSummary.progress}
              progressLabel={`Потрачено: ${formatCurrency(financeSummary.totalActualCost)}`}
            />
            <MetricCard
              label="Активные объекты"
              value={String(objectCounts.total)}
              icon={Building2}
              tone="blue"
              footer={
                <>
                  <span className="font-semibold text-green">В работе: {objectCounts.inProgress}</span>
                  {" · "}
                  <span className="font-semibold text-blue">Завершено: {objectCounts.completed}</span>
                </>
              }
            />
            {payrollDebt !== null && (
              <MetricCard
                label="Задолженность по ЗП"
                value={formatCurrency(payrollDebt)}
                icon={Banknote}
                tone="green"
                footer="Неоплаченные начисления"
              />
            )}
            <MetricCard
              label="Выполнено нарядов"
              value={formatPercent(workOrderCompletion)}
              icon={ClipboardCheck}
              tone="purple"
              footer="Принято или закрыто"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <Card className="p-5 sm:p-6">
              <h2 className="text-[17px] font-bold text-ink">Наряды по статусам</h2>
              <div className="mt-4 flex flex-col gap-2">
                {workStatus.workOrderStatusCounts.length === 0 ? (
                  <p className="text-sm text-ink-muted">Нарядов пока нет</p>
                ) : (
                  workStatus.workOrderStatusCounts.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-ink-secondary">
                        {WORK_ORDER_STATUS_LABEL[entry.status as WorkOrderStatus] ?? entry.status}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5F5F4]">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${workOrderStatusTotal ? (entry.count / workOrderStatusTotal) * 100 : 0}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold text-ink">{entry.count}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="min-w-0">
              <PageHeader
                title="Состояние объектов"
                action={
                  <button type="button" onClick={() => navigate("/objects")} className="text-sm font-semibold text-primary hover:text-primary-hover">
                    Все объекты
                  </button>
                }
              />
              {objectStateRows.length > 0 ? (
                <DataTable columns={objectColumns} rows={objectStateRows} rowKey={(row) => row.objectId} />
              ) : (
                <p className="px-5 pb-5 text-sm text-ink-muted sm:px-6">Объектов пока нет</p>
              )}
            </Card>

            <Card className="min-w-0">
              <PageHeader title="Требует внимания" />
              {attentionItems.length > 0 ? (
                <RiskList items={attentionItems} onOpen={() => navigate("/works")} />
              ) : (
                <p className="px-5 pb-5 text-sm text-ink-muted sm:px-6">Просроченных нарядов нет</p>
              )}
            </Card>
          </div>

          {budgetChartData.length > 0 && (
            <Card className="mt-4 min-w-0 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">Бюджет по объектам</h2>
              <div className="mt-4">
                <ObjectBudgetChart data={budgetChartData} />
              </div>
            </Card>
          )}
        </>
      )}
    </AppLayout>
  );
}
