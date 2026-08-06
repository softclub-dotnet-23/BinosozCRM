import { useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, Clock3, UserX } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useApproveTimesheet, useTimesheets } from "../hooks/api/useTimesheets";
import { useWorkers, useMyBrigadeWorkers } from "../hooks/api/useWorkers";
import { useObjects } from "../hooks/api/useObjects";
import { normalizeApiError } from "../services/apiError";
import { formatDateShort, formatTimeOnly } from "../utils/date";
import type { TimesheetDto } from "../services/timesheetsApi";

const PAGE_SIZE = 20;

/**
 * GET /timesheets scopes automatically by caller role (ListTimesheetsQueryHandler): Owner sees
 * everything, Prorab sees their assigned objects (or everything with zero assignments), Brigadir
 * sees their own brigade — so this page needs no client-side role branching for the data itself,
 * only for which name-resolution lists it's allowed to call (Brigadir has no company-wide
 * Workers/Objects access; Owner/Prorab do).
 */
export default function AttendancePage() {
  const { user } = useAuth();
  const isBrigadir = user?.role === "brigadir";
  const canApprove = user?.role === "prorab";

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useTimesheets({ page, pageSize: PAGE_SIZE });
  const approveMutation = useApproveTimesheet();

  const { data: companyWorkersData } = useWorkers({ page: 1, pageSize: 500 }, !isBrigadir);
  const { data: myWorkersData } = useMyBrigadeWorkers({ page: 1, pageSize: 200 }, isBrigadir);
  const { data: objectsData } = useObjects({ page: 1, pageSize: 200 }, !isBrigadir);

  const workers = companyWorkersData?.items ?? myWorkersData?.items ?? [];
  const objects = objectsData?.items ?? [];
  const workerName = (id: string) => workers.find((w) => w.id === id)?.fullName ?? id.slice(0, 8);
  const objectName = (id: string) => objects.find((o) => o.id === id)?.name ?? (isBrigadir ? "—" : id.slice(0, 8));

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  const kpis = useMemo(() => {
    const present = rows.filter((r) => r.checkInAt !== null).length;
    const late = rows.filter((r) => (r.lateMinutes ?? 0) > 0).length;
    const pendingApproval = rows.filter((r) => r.checkOutAt !== null && r.approvedAt === null).length;
    return { total: rows.length, present, late, pendingApproval };
  }, [rows]);

  const columns: DataTableColumn<TimesheetDto>[] = [
    { key: "date", header: "Дата", sticky: "left", width: "100px", render: (row) => <span className="whitespace-nowrap font-medium text-ink">{formatDateShort(row.date)}</span> },
    { key: "worker", header: "Сотрудник", render: (row) => <span className="text-ink">{workerName(row.workerId)}</span> },
    { key: "object", header: "Объект", render: (row) => <span className="text-ink-secondary">{objectName(row.objectId)}</span> },
    { key: "checkIn", header: "Приход", render: (row) => <span className="tabular text-ink-secondary">{row.checkInAt ? formatTimeOnly(row.checkInAt) : "—"}</span> },
    { key: "checkOut", header: "Уход", render: (row) => <span className="tabular text-ink-secondary">{row.checkOutAt ? formatTimeOnly(row.checkOutAt) : "—"}</span> },
    {
      key: "status",
      header: "Статус",
      render: (row) => {
        if (row.checkInAt === null) return <Badge tone="red">Не отмечен</Badge>;
        if ((row.lateMinutes ?? 0) > 0) return <Badge tone="orange">Опоздание {row.lateMinutes} мин</Badge>;
        if (row.approvedAt) return <Badge tone="green">Утверждено</Badge>;
        return <Badge tone="blue">Присутствовал</Badge>;
      },
    },
    ...(canApprove
      ? [{
          key: "actions",
          header: "",
          width: "120px",
          render: (row: TimesheetDto) =>
            row.checkOutAt && !row.approvedAt ? (
              <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(row.id)}>Утвердить</Button>
            ) : null,
        } satisfies DataTableColumn<TimesheetDto>]
      : []),
  ];

  return (
    <AppLayout title="Явка" subtitle="Табели учёта рабочего времени">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Записей на странице" value={String(kpis.total)} icon={CalendarCheck} tone="blue" />
        <MetricCard label="Отметились" value={String(kpis.present)} icon={CheckCircle2} tone="green" />
        <MetricCard label="Опоздания" value={String(kpis.late)} icon={Clock3} tone="orange" />
        <MetricCard label="Ожидают утверждения" value={String(kpis.pendingApproval)} icon={UserX} tone="red" />
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4">{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)}</div>
        ) : isError ? (
          <EmptyState icon={AlertCircle} title="Не удалось загрузить табели" description={normalizeApiError(error).message} action={<Button variant="outline" size="sm" onClick={() => refetch()}>Повторить</Button>} />
        ) : rows.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Табелей пока нет" description="Записи появятся после отметок прихода/ухода" />
        ) : (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
            {data && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-ink-secondary">
                <span>Страница {page} из {pageCount}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</Button>
                  <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Далее</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </AppLayout>
  );
}
