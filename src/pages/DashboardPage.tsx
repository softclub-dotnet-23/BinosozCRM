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
import { attentionItems, budgetSeriesByPeriod, dashboardKpis, objectStateRows } from "../data/mockDashboard";
import { payrollRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { getDashboardPayrollSummary } from "../utils/payrollAnalytics";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatPercent } from "../utils/format";
import type { PeriodFilter } from "../types";

const PERIOD_TABS: { key: PeriodFilter; label: string }[] = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "quarter", label: "Квартал" },
  { key: "year", label: "Год" },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [payrollRecords, setPayrollRecords] = useRepositoryState(payrollRepository);

  const chartData = budgetSeriesByPeriod[period];
  const remaining = dashboardKpis.totalBudget - dashboardKpis.spentBudget;
  const budgetProgress = Math.round((dashboardKpis.spentBudget / dashboardKpis.totalBudget) * 100);

  const overBudget = useMemo(() => Math.max(0, dashboardKpis.spentBudget - dashboardKpis.totalBudget), []);
  const payrollSummary = useMemo(() => getDashboardPayrollSummary(payrollRecords), [payrollRecords]);

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
          value={formatCurrency(dashboardKpis.payrollDebt)}
          icon={Banknote}
          tone="green"
          footer={<>Следующая выплата: {dashboardKpis.nextPayoutDate}</>}
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
