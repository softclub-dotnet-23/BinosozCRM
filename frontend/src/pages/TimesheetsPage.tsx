import { useState, type FormEvent } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useApproveTimesheet, useCheckIn, useCheckOut, useTimesheets } from "../hooks/api/useTimesheets";
import { normalizeApiError } from "../services/apiError";
import type { TimesheetDto } from "../services/timesheetsApi";
import { formatDateShort, formatTimeOnly } from "../utils/date";

const PAGE_SIZE = 10;

/**
 * Dedicated page for TimesheetsController (api/v1/timesheets) — real backend data. The existing
 * AttendancePage.tsx is a materially different shape (resolved employeeName/objectName strings,
 * a `note` field, richer mock statuses) with no worker/object name resolution available from this
 * DTO (workerId/objectId are raw GUIDs; Brigadir has no accessible Workers/Objects list endpoint,
 * same confirmed gap as Individual Tasks), so it's preserved untouched rather than retrofitted.
 */
export default function TimesheetsPage() {
  const { user } = useAuth();
  const isBrigadir = user?.role === "brigadir";
  const canApprove = user?.role === "prorab";

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useTimesheets({ page, pageSize: PAGE_SIZE });

  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const approveMutation = useApproveTimesheet();

  const columns: DataTableColumn<TimesheetDto>[] = [
    {
      key: "date",
      header: "Дата",
      sticky: "left",
      width: "100px",
      render: (row) => <span className="whitespace-nowrap font-medium text-ink">{formatDateShort(row.date)}</span>,
    },
    {
      key: "worker",
      header: "ID работника",
      render: (row) => <span className="font-mono text-xs text-ink-secondary">{row.workerId}</span>,
    },
    {
      key: "object",
      header: "ID объекта",
      render: (row) => <span className="font-mono text-xs text-ink-secondary">{row.objectId}</span>,
    },
    {
      key: "checkIn",
      header: "Приход",
      render: (row) => (
        <span className={`tabular whitespace-nowrap font-semibold ${row.checkInAt ? (row.lateMinutes ? "text-warning" : "text-green") : "text-ink-muted"}`}>
          {row.checkInAt ? formatTimeOnly(row.checkInAt) : "—"}
        </span>
      ),
    },
    {
      key: "checkOut",
      header: "Уход",
      render: (row) => (
        <span className={`tabular whitespace-nowrap font-semibold ${row.checkOutAt ? "text-red" : "text-ink-muted"}`}>
          {row.checkOutAt ? formatTimeOnly(row.checkOutAt) : "—"}
        </span>
      ),
    },
    {
      key: "hours",
      header: "Отработано",
      render: (row) => <span className="tabular text-ink-secondary">{row.hoursWorked ? `${row.hoursWorked} ч.` : "—"}</span>,
    },
    {
      key: "status",
      header: "Статус",
      render: (row) =>
        row.approvedAt ? (
          <Badge tone="green">утверждён</Badge>
        ) : row.checkOutAt ? (
          <Badge tone="blue">завершён</Badge>
        ) : row.checkInAt ? (
          <Badge tone="orange">на смене</Badge>
        ) : (
          <Badge tone="purple">—</Badge>
        ),
    },
    {
      key: "actions",
      header: "Действия",
      sticky: "right",
      width: "160px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isBrigadir && row.checkInAt && !row.checkOutAt && (
            <Button size="sm" variant="outline" disabled={checkOutMutation.isPending} onClick={() => checkOutMutation.mutate(row.id)}>
              <LogOut size={13} /> Уход
            </Button>
          )}
          {canApprove && row.checkOutAt && !row.approvedAt && (
            <Button size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(row.id)}>
              <CheckCircle2 size={13} /> Утвердить
            </Button>
          )}
        </div>
      ),
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout
      title="Табели учёта времени"
      subtitle={isBrigadir ? "Приход/уход вашей бригады" : "Табели по вашим объектам"}
    >
      {(
        <>
          {isBrigadir && <CheckInCard mutation={checkInMutation} />}

          <Card className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
              <h2 className="text-lg font-bold text-ink">Список табелей</h2>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="px-5 sm:px-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={7} />
                  ))}
                </div>
              ) : isError ? (
                <EmptyState
                  icon={AlertCircle}
                  title="Не удалось загрузить табели"
                  description={normalizeApiError(error).message}
                  action={
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Повторить
                    </Button>
                  }
                />
              ) : rows.length > 0 ? (
                <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
              ) : (
                <EmptyState icon={CalendarCheck} title="Табелей пока нет" description="Записи появятся после первого прихода" />
              )}
            </div>

            {data && data.totalCount > 0 && (
              <Pagination
                page={page}
                pageCount={pageCount}
                pageSize={PAGE_SIZE}
                total={data.totalCount}
                itemLabel="табелей"
                onPageChange={setPage}
                onPageSizeChange={() => {}}
              />
            )}
          </Card>
        </>
      )}
    </AppLayout>
  );
}

function CheckInCard({ mutation }: { mutation: ReturnType<typeof useCheckIn> }) {
  const [workerId, setWorkerId] = useState("");
  const [objectId, setObjectId] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mutation.isPending || !workerId.trim() || !objectId.trim()) return;
    mutation.mutate(
      { workerId: workerId.trim(), objectId: objectId.trim() },
      { onSuccess: () => { setWorkerId(""); setObjectId(""); } },
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <LogIn size={16} className="text-primary" />
        <h2 className="text-lg font-bold text-ink">Отметить приход</h2>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Backend не предоставляет вашей роли список работников бригады или объектов (GET /brigades/{"{id}"}/workers и
        GET /objects доступны только Owner/Prorab) — введите ID вручную.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-sm font-medium text-ink" htmlFor="checkin-worker-id">
            ID работника
          </label>
          <input
            id="checkin-worker-id"
            required
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            placeholder="GUID (себя или члена бригады)"
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="text-sm font-medium text-ink" htmlFor="checkin-object-id">
            ID объекта
          </label>
          <input
            id="checkin-object-id"
            required
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            placeholder="GUID объекта"
            className="mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Отметка..." : "Отметить приход"}
        </Button>
      </form>
    </Card>
  );
}
