import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useObjects, useObjectCostBreakdown } from "../hooks/api/useObjects";
import { normalizeApiError } from "../services/apiError";
import { formatCurrency } from "../utils/format";
import type { ConstructionObjectDto } from "../services/objectsApi";

export default function BudgetsPage() {
  const { data, isLoading, isError, error, refetch } = useObjects({ page: 1, pageSize: 200 });
  const objects = (data?.items ?? []).filter((o) => o.budget !== null);

  const columns: DataTableColumn<ConstructionObjectDto>[] = [
    { key: "name", header: "Объект", sticky: "left", width: "220px", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    { key: "budget", header: "Бюджет", render: (row) => <span className="tabular text-ink">{formatCurrency(row.budget!)}</span> },
    { key: "actual", header: "Факт", render: (row) => <ActualCostCell objectId={row.id} /> },
    { key: "variance", header: "Отклонение", render: (row) => <VarianceCell objectId={row.id} budget={row.budget!} /> },
  ];

  return (
    <AppLayout title="Бюджеты" subtitle="Бюджет и факт по объектам (материалы + зарплата за оплаченные периоды)">
      <BudgetKpis objects={objects} />

      <Card className="mt-4">
        {isLoading ? (
          <div className="p-4">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
        ) : isError ? (
          <EmptyState icon={AlertTriangle} title="Не удалось загрузить объекты" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
        ) : objects.length === 0 ? (
          <EmptyState icon={Wallet} title="Нет объектов с указанным бюджетом" description="Укажите бюджет объекта на странице «Объекты»" />
        ) : (
          <DataTable columns={columns} rows={objects} rowKey={(row) => row.id} />
        )}
      </Card>
    </AppLayout>
  );
}

function BudgetKpis({ objects }: { objects: ConstructionObjectDto[] }) {
  const totalBudget = useMemo(() => objects.reduce((sum, o) => sum + (o.budget ?? 0), 0), [objects]);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Объектов с бюджетом" value={String(objects.length)} icon={Wallet} tone="blue" />
      <MetricCard label="Суммарный бюджет" value={formatCurrency(totalBudget)} icon={Wallet} tone="purple" />
      <MetricCard label="Факт по объектам" value="см. таблицу ниже" icon={TrendingUp} tone="orange" />
    </div>
  );
}

function ActualCostCell({ objectId }: { objectId: string }) {
  const { data, isLoading, isError } = useObjectCostBreakdown(objectId);
  if (isLoading) return <span className="text-ink-muted">…</span>;
  if (isError || !data) return <span className="text-ink-muted">—</span>;
  return <span className="tabular text-ink">{formatCurrency(data.totalCost)}</span>;
}

function VarianceCell({ objectId, budget }: { objectId: string; budget: number }) {
  const { data, isLoading, isError } = useObjectCostBreakdown(objectId);
  if (isLoading || isError || !data) return <span className="text-ink-muted">—</span>;
  const variance = budget - data.totalCost;
  const overBudget = variance < 0;
  return (
    <Badge tone={overBudget ? "red" : "green"}>
      {overBudget ? <TrendingDown size={12} className="mr-1 inline" /> : <CheckCircle2 size={12} className="mr-1 inline" />}
      {formatCurrency(Math.abs(variance))} {overBudget ? "перерасход" : "в рамках"}
    </Badge>
  );
}
