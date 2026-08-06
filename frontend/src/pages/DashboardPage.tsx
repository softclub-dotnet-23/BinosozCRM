import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Banknote, Building2, ClipboardCheck, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { WorkStatusFromBackendCard } from "../components/dashboard/WorkStatusFromBackendCard";
import { useObjects } from "../hooks/api/useObjects";
import { usePayroll } from "../hooks/api/usePayroll";
import { useAuth } from "../context/AuthContext";
import { normalizeApiError } from "../services/apiError";
import { CONSTRUCTION_OBJECT_STATUS_LABEL, ConstructionObjectStatus, PayrollEntryStatus } from "../services/types";
import type { ConstructionObjectDto } from "../services/objectsApi";
import { formatCurrency } from "../utils/format";
import BrigadirDashboardPage from "./BrigadirDashboardPage";

const STATUS_TONE: Record<ConstructionObjectStatus, "blue" | "green" | "orange" | "red" | "purple"> = {
  [ConstructionObjectStatus.Planned]: "blue",
  [ConstructionObjectStatus.InProgress]: "orange",
  [ConstructionObjectStatus.Suspended]: "red",
  [ConstructionObjectStatus.Completed]: "green",
  [ConstructionObjectStatus.Closed]: "purple",
};

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirDashboardPage />;
  return <CompanyDashboard />;
}

function CompanyDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useObjects({ page: 1, pageSize: 200 });
  const { data: payrollData } = usePayroll({ page: 1, pageSize: 200 });

  const objects = data?.items ?? [];
  const payrollEntries = payrollData?.items ?? [];

  const kpis = useMemo(() => {
    const inProgress = objects.filter((o) => o.status === ConstructionObjectStatus.InProgress).length;
    const totalBudget = objects.reduce((sum, o) => sum + (o.budget ?? 0), 0);
    const pendingPayroll = payrollEntries.filter((p) => p.status === PayrollEntryStatus.Draft).length;
    return { totalObjects: objects.length, inProgress, totalBudget, pendingPayroll };
  }, [objects, payrollEntries]);

  const columns: DataTableColumn<ConstructionObjectDto>[] = [
    { key: "name", header: "Объект", sticky: "left", width: "220px", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    { key: "status", header: "Статус", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{CONSTRUCTION_OBJECT_STATUS_LABEL[row.status]}</Badge> },
    { key: "budget", header: "Бюджет", render: (row) => <span className="tabular text-ink">{row.budget !== null ? formatCurrency(row.budget) : "—"}</span> },
    { key: "plannedEndDate", header: "Плановое завершение", render: (row) => <span className="tabular text-ink-secondary">{row.plannedEndDate ?? "—"}</span> },
  ];

  return (
    <AppLayout title="Обзор" subtitle="Сводка по компании">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Объектов всего" value={String(kpis.totalObjects)} icon={Building2} tone="blue" />
        <MetricCard label="В работе" value={String(kpis.inProgress)} icon={ClipboardCheck} tone="orange" />
        <MetricCard label="Суммарный бюджет" value={formatCurrency(kpis.totalBudget)} icon={Wallet} tone="purple" />
        <MetricCard label="Черновиков зарплаты" value={String(kpis.pendingPayroll)} icon={Banknote} tone="green" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Объекты</h2>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="px-5 sm:px-6">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
            ) : isError ? (
              <div className="px-5 sm:px-6 pb-5">
                <EmptyState icon={AlertCircle} title="Не удалось загрузить объекты" description={normalizeApiError(error).message} />
              </div>
            ) : objects.length === 0 ? (
              <div className="px-5 sm:px-6 pb-5">
                <EmptyState icon={Building2} title="Объектов пока нет" description="Создайте первый объект" />
              </div>
            ) : (
              <DataTable columns={columns} rows={objects.slice(0, 8)} rowKey={(row) => row.id} onRowClick={() => navigate("/objects")} />
            )}
          </div>
        </Card>

        <WorkStatusFromBackendCard />
      </div>
    </AppLayout>
  );
}
