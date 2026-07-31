import { useState, type FormEvent } from "react";
import { AlertCircle, Plus, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { BackendSessionRequired } from "../components/auth/BackendSessionRequired";
import { useAuth } from "../context/AuthContext";
import { useCreatePayrollAdvance, usePayrollAdvances } from "../hooks/api/usePayrollAdvances";
import { normalizeApiError } from "../services/apiError";
import type { PayrollAdvanceDto } from "../services/payrollAdvancesApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

/** Dedicated page for PayrollAdvancesController (api/v1/payroll-advances). Create is
 * Owner/Accountant only (class-level default, not overridden for POST); List additionally
 * allows Brigadir to read (server-scoped to their own records, per the controller's own comment). */
export default function PayrollAdvancesPage() {
  const { user } = useAuth();
  const isBackendSession = user?.isBackendSession ?? false;
  const canCreate = isBackendSession && (user?.role === "owner" || user?.role === "accountant");

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = usePayrollAdvances({ page, pageSize: PAGE_SIZE }, isBackendSession);
  const [createOpen, setCreateOpen] = useState(false);
  const createMutation = useCreatePayrollAdvance();

  const columns: DataTableColumn<PayrollAdvanceDto>[] = [
    {
      key: "worker",
      header: "ID работника",
      sticky: "left",
      width: "200px",
      render: (row) => <span className="font-mono text-xs text-ink-secondary">{row.workerId}</span>,
    },
    {
      key: "amount",
      header: "Сумма",
      render: (row) => <span className="tabular font-semibold text-ink">{row.amount.toLocaleString("ru-RU")} с.</span>,
    },
    {
      key: "issuedAt",
      header: "Дата выдачи",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{formatDateShort(row.issuedAt)}</span>,
    },
    {
      key: "note",
      header: "Примечание",
      render: (row) => <span className="text-ink-secondary">{row.note || "—"}</span>,
    },
    {
      key: "settled",
      header: "Погашен",
      render: (row) => (
        <span className={row.settledInPayrollEntryId ? "text-green" : "text-ink-muted"}>
          {row.settledInPayrollEntryId ? "да" : "нет"}
        </span>
      ),
    },
  ];

  const rows = data?.items ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <AppLayout
      title="Авансы"
      subtitle="Авансовые выплаты сотрудникам"
      action={
        canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Новый аванс
          </Button>
        ) : undefined
      }
    >
      {!isBackendSession ? (
        <BackendSessionRequired roleHint="Owner, Accountant или Brigadir" />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список авансов</h2>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="px-5 sm:px-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={5} />
                ))}
              </div>
            ) : isError ? (
              <EmptyState
                icon={AlertCircle}
                title="Не удалось загрузить авансы"
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
              <EmptyState icon={Wallet} title="Авансов пока нет" description="Записи появятся после первой выдачи" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="авансов"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      )}

      {canCreate && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый аванс">
          <AdvanceForm
            onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
            onCancel={() => setCreateOpen(false)}
            submitting={createMutation.isPending}
          />
        </Modal>
      )}
    </AppLayout>
  );
}

function AdvanceForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (request: { workerId: string; amount: number; note?: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !workerId.trim() || !amount.trim()) return;
    onSubmit({ workerId: workerId.trim(), amount: Number(amount), note: note.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="pa-worker-id">
          ID работника
        </label>
        <input id="pa-worker-id" required value={workerId} onChange={(e) => setWorkerId(e.target.value)} placeholder="GUID работника" className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="pa-amount">
          Сумма, сомони
        </label>
        <input id="pa-amount" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="pa-note">
          Примечание (необязательно)
        </label>
        <input id="pa-note" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Сохранение..." : "Выдать аванс"}
        </Button>
      </div>
    </form>
  );
}
