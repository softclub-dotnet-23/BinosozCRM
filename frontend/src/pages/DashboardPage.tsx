import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Building2, ClipboardCheck, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { ObjectStateTable } from "../components/tables/ObjectStateTable";
import { AttentionList } from "../components/tables/AttentionList";
import { BudgetChart } from "../components/charts/BudgetChart";
import { BudgetSummaryBlocks } from "../components/dashboard/BudgetSummaryBlocks";
import { PayrollCard } from "../components/dashboard/PayrollCard";
import { budgetSeriesByPeriod } from "../data/mockDashboard";
import { objectsRepository, worksRepository, materialsRepository, payrollRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { getDashboardPayrollSummary, getUpcomingPayments } from "../utils/payrollAnalytics";
import { computeWorkAnalytics, computeCriticalWorks } from "../utils/workAnalytics";
import { getCriticalMaterials } from "../utils/materialAnalytics";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatPercent } from "../utils/format";
import { formatDateRu } from "../utils/date";
import type { AttentionItem, ObjectStatus, ObjectSummaryRow, PeriodFilter } from "../types";
import { useAuth } from "../context/AuthContext";
import BrigadirDashboardPage from "./BrigadirDashboardPage";

const OBJECT_STATUS_PRIORITY: Record<ObjectStatus, number> = {
  at_risk: 0,
  in_progress: 1,
  almost_done: 2,
  completed: 3,
};

const PERIOD_TABS: { key: PeriodFilter; label: string }[] = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "quarter", label: "Квартал" },
  { key: "year", label: "Год" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "brigadir") return <BrigadirDashboardPage />;

  return <CompanyDashboard />;
}

function CompanyDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [payrollRecords, setPayrollRecords] = useRepositoryState(payrollRepository);
  const objects = useRepositorySnapshot(objectsRepository);
  const works = useRepositorySnapshot(worksRepository);
  const materials = useRepositorySnapshot(materialsRepository);

  const todayIso = new Date().toISOString().slice(0, 10);

  const dashboardKpis = useMemo(() => {
    const totalBudget = objects.reduce((sum, o) => sum + o.budget, 0);
    const spentBudget = objects.reduce((sum, o) => sum + o.spent, 0);
    const completedObjects = objects.filter((o) => o.status === "completed").length;
    const activeObjects = objects.length;
    const workAnalytics = computeWorkAnalytics(works);
    return {
      totalBudget,
      spentBudget,
      activeObjects,
      inProgressObjects: activeObjects - completedObjects,
      completedObjects,
      completedWorksPercent: workAnalytics.completedPercent,
    };
  }, [objects, works]);

  const objectStateRows: ObjectSummaryRow[] = useMemo(
    () =>
      [...objects]
        .sort(
          (a, b) =>
            OBJECT_STATUS_PRIORITY[a.status] - OBJECT_STATUS_PRIORITY[b.status] || a.progress - b.progress,
        )
        .slice(0, 6)
        .map((o) => ({ id: o.id, name: o.name, foreman: o.foreman, progress: o.progress, budget: o.budget, status: o.status })),
    [objects],
  );

  const attentionItems: AttentionItem[] = useMemo(() => {
    const overdueWorks = computeCriticalWorks(works, todayIso, 4).map(({ work, overdueDays }) => ({
      id: `work-${work.id}`,
      title: work.title,
      objectName: work.objectName,
      responsible: work.responsible.name,
      alertLabel: `Просрочено на ${overdueDays} дн.`,
      severity: "red" as const,
      icon: "clock" as const,
    }));
    const criticalMaterials = getCriticalMaterials(materials)
      .slice(0, 3)
      .map((material) => ({
        id: `material-${material.id}`,
        title: material.name,
        objectName: material.warehouse,
        responsible: material.supplier,
        alertLabel: material.stock <= 0 ? "Остаток исчерпан" : "Остаток ниже минимума",
        severity: material.stock <= 0 ? ("red" as const) : ("orange" as const),
        icon: "box" as const,
      }));
    return [...overdueWorks, ...criticalMaterials].slice(0, 6);
  }, [works, materials, todayIso]);

  const chartData = budgetSeriesByPeriod[period];
  const remaining = dashboardKpis.totalBudget - dashboardKpis.spentBudget;
  const budgetProgress = dashboardKpis.totalBudget > 0 ? Math.round((dashboardKpis.spentBudget / dashboardKpis.totalBudget) * 100) : 0;

  const overBudget = Math.max(0, dashboardKpis.spentBudget - dashboardKpis.totalBudget);
  const payrollSummary = useMemo(() => getDashboardPayrollSummary(payrollRecords), [payrollRecords]);
  const nextPayment = useMemo(() => getUpcomingPayments(payrollRecords, 1)[0], [payrollRecords]);
  const payrollDebt = payrollRecords
    .filter((r) => r.status !== "paid" && r.status !== "cancelled")
    .reduce((sum, r) => sum + r.netPayable, 0);

  function transitionBatch(status: "pending_approval" | "returned", nextStatus: "approved" | "returned", comment: string) {
    const now = new Date().toISOString();
    const actor = "Садди Имомов";
    setPayrollRecords((prev) =>
      prev.map((r) => {
        if (r.status !== status || !payrollSummary || r.periodLabel !== payrollSummary.period) return r;
        return {
          ...r,
          status: nextStatus,
          updatedAt: now,
          ...(nextStatus === "approved" ? { approvedBy: actor, approvedAt: now } : { returnedBy: actor, returnedAt: now, returnReason: comment }),
          statusHistory: [
            ...r.statusHistory,
            { id: `${r.id}-${r.statusHistory.length + 1}`, status: nextStatus, date: now, actor, comment: comment || (nextStatus === "approved" ? "Утверждено с Обзора" : "") },
          ],
        };
      }),
    );
  }

  return (
    <AppLayout title="Обзор компании" subtitle="Контроль объектов, финансов и выполнения работ">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Общий бюджет"
          value={formatCurrency(dashboardKpis.totalBudget)}
          icon={Wallet}
          tone="orange"
          progress={budgetProgress}
          progressLabel={`Израсходовано: ${formatCurrency(dashboardKpis.spentBudget)}`}
        />
        <MetricCard
          label="Активные объекты"
          value={String(dashboardKpis.activeObjects)}
          icon={Building2}
          tone="blue"
          footer={
            <>
              <span className="font-semibold text-green">{dashboardKpis.inProgressObjects} в работе</span>
              {" · "}
              <span className="font-semibold text-blue">{dashboardKpis.completedObjects} завершены</span>
            </>
          }
        />
        <MetricCard
          label="Задолженность по зарплате"
          value={formatCurrency(payrollDebt)}
          icon={Banknote}
          tone="green"
          footer={<>Следующая выплата: {nextPayment?.paymentDate ? formatDateRu(nextPayment.paymentDate) : "не запланирована"}</>}
        />
        <MetricCard
          label="Выполненные работы"
          value={formatPercent(dashboardKpis.completedWorksPercent)}
          icon={ClipboardCheck}
          tone="purple"
          footer="Общий прогресс по всем объектам"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <PageHeader
            title="Состояние объектов"
            action={
              <button
                type="button"
                onClick={() => navigate("/objects")}
                className="text-sm font-semibold text-primary hover:text-primary-hover"
              >
                Все объекты →
              </button>
            }
          />
          <ObjectStateTable rows={objectStateRows} />
        </Card>

        <Card>
          <PageHeader title="Работы, требующие внимания" />
          <AttentionList items={attentionItems} />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold text-ink">Бюджет и фактические расходы</h2>
            <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F4] p-1">
              {PERIOD_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPeriod(tab.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    period === tab.key ? "bg-card text-primary shadow-sm" : "text-ink-secondary hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_240px]">
            <BudgetChart data={chartData} />
            <BudgetSummaryBlocks
              totalBudget={dashboardKpis.totalBudget}
              actualSpent={dashboardKpis.spentBudget}
              remaining={remaining}
              overBudget={overBudget}
            />
          </div>
        </Card>

        {payrollSummary && (
          <PayrollCard
            summary={payrollSummary}
            onApprove={() => {
              transitionBatch("pending_approval", "approved", "");
              showToast("Зарплата утверждена");
            }}
            onReturn={(comment) => {
              transitionBatch("pending_approval", "returned", comment);
              showToast("Расчёт возвращён бухгалтеру", "info");
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
