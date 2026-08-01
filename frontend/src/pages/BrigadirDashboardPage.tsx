import { LayoutDashboard } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

/**
 * This dashboard's widgets (crew roster, brigade identity/efficiency,
 * attendance-with-names, critical materials) all depend on backend contracts
 * that don't exist for a Brigadir caller — see BrigadirTeamPage.tsx and
 * BrigadirAttendancePage.tsx for the specific gaps, and note materials has no
 * real API in this codebase at all yet (MaterialsPage.tsx is still
 * mock-only). "Мои работы" (/works) is the one Brigadir data source with a
 * real, usable contract (GET /work-orders/mine) — it's a real page in its
 * own right rather than a card here, so this landing dashboard is left
 * unavailable rather than showing one real card next to three fabricated
 * ones. See the frontend audit (2026-07-31) and its remediation report.
 */
export default function BrigadirDashboardPage() {
  return (
    <AppLayout title="Панель бригадира" subtitle="Раздел пока недоступен">
      <Card>
        <EmptyState
          icon={LayoutDashboard}
          title="Раздел пока недоступен"
          description="Backend ещё не даёт бригадиру данные для большинства виджетов этой панели. Актуальные данные по вашим работам доступны в разделе «Мои работы»."
        />
      </Card>
    </AppLayout>
  );
}
