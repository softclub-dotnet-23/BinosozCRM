import { BarChart3 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * Every section of this report (payroll, budgets, materials, estimates)
 * sourced from data/repositories mock data, and its payroll figures were
 * calculated client-side (utils/payrollAnalytics.ts's calculatePayrollRecord)
 * — exactly the money-calculation duplication AGENTS.md's non-negotiable
 * rule 1 exists to prevent ("money is calculated only on the backend"), and
 * on top of data that was never real to begin with. Budgets/materials/stock/
 * estimates have no backend entity at all (see BudgetsPage.tsx,
 * MaterialsPage.tsx, StockPage.tsx, EstimatesPage.tsx), so there isn't
 * enough real, confirmed backend data to reconstruct even a reduced version
 * of this report honestly. Per the remediation rules ("when backend data is
 * not sufficient, mark that report section unavailable rather than
 * calculating or fabricating it"), the whole page is marked unavailable
 * rather than shipping a partially-fabricated report. Real, already-wired
 * payroll data is available at /payroll (PayrollPage.tsx), which only ever
 * displays backend-computed figures. See the frontend audit (2026-07-31) and
 * its remediation report.
 */
export default function ReportsPage() {
  return (
    <AppLayout title="Отчёты" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={BarChart3}
          title="Раздел пока недоступен"
          description="Отчёты строились на данных без бизнес-контракта на backend, включая расчёт зарплаты на клиенте. Раздел появится, когда для всех его данных будет подтверждённый backend API. Актуальные данные по зарплате доступны в разделе «Зарплаты»."
        />
      </Card>
    </AppLayout>
  );
}
