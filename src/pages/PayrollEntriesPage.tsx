import { useState, type FormEvent } from "react";
import { AlertCircle, Banknote, CheckCircle2, Plus, Settings2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { BackendSessionRequired } from "../components/auth/BackendSessionRequired";
import { useAuth } from "../context/AuthContext";
import { useAdjustPayrollEntry, useApprovePayrollEntry, useCreatePayrollEntry, usePayPayrollEntry, usePayroll } from "../hooks/api/usePayroll";
import { normalizeApiError } from "../services/apiError";
import { PAYROLL_ENTRY_STATUS_LABEL, PayrollEntryStatus } from "../services/types";
import type { PayrollEntryDto } from "../services/payrollApi";
import { formatDateShort } from "../utils/date";

const PAGE_SIZE = 10;

const STATUS_TONE: Record<PayrollEntryStatus, "purple" | "blue" | "green"> = {
  [PayrollEntryStatus.Draft]: "purple",
  [PayrollEntryStatus.Approved]: "blue",
  [PayrollEntryStatus.Paid]: "green",
};

/**
 * Dedicated page for PayrollController (api/v1/payroll) real data. PayrollPage.tsx (existing,
 * mock) is a materially different shape (employeeName, richer attendance-derived breakdown) with
 * no worker-name resolution available from this DTO — kept separate rather than retrofitted.
 * Create/Adjust: Accountant only. Approve/Pay: Owner+Accountant. Brigadir: read own only
 * (server-scoped, confirmed from PayrollController's class-level Owner,Accountant,Brigadir).
 */
export default function PayrollEntriesPage() {
  const { user } = useAuth();
  const isBackendSession = user?.isBackendSession ?? false;
  const isAccountant = isBackendSession && user?.role === "accountant";
  const canApprovePay = isBackendSession && (user?.role === "owner" || user?.role === "accountant");

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = usePayroll({ page, pageSize: PAGE_SIZE }, isBackendSession);

  const [createOpen, setCreateOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<PayrollEntryDto | null>(null);

  const createMutation = useCreatePayrollEntry();
  const approveMutation = useApprovePayrollEntry();
  const payMutation = usePayPayrollEntry();
  const adjustMutation = useAdjustPayrollEntry();

  const columns: DataTableColumn<PayrollEntryDto>[] = [
    {
      key: "worker",
      header: "ID работника",
      sticky: "left",
      width: "180px",
      render: (row) => <span className="font-mono text-xs text-ink-secondary">{row.workerId}</span>,
    },
    {
      key: "period",
      header: "Период",
      render: (row) => (
        <span className="whitespace-nowrap text-ink-secondary">
          {formatDateShort(row.periodStart)} – {formatDateShort(row.periodEnd)}
        </span>
      ),
    },
    {
      key: "amounts",
      header: "Начислено / Итого",
      render: (row) => (
        <div className="text-sm">
          <p className="tabular text-ink-secondary">{row.calculatedAmount.toLocaleString("ru-RU")} с.</p>
          <p className="tabular font-semibold text-ink">{(row.finalAmount ?? row.calculatedAmount).toLocaleString("ru-RU")} с.</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{PAYROLL_ENTRY_STATUS_LABEL[row.status]}</Badge>,
    },
    {
      key: "actions",
      header: "Действия",
      sticky: "right",
      width: "260px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {canApprovePay && row.status === PayrollEntryStatus.Draft && (
            <Button size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(row.id)}>
              <CheckCircle2 size={13} /> Утвердить
            </Button>
          )}
          {canApprovePay && row.status === PayrollEntryStatus.Approved && (
            <Button size="sm" disabled={payMutation.isPending} onClick={() => payMutation.mutate(row.id)}>
              <Banknote size={13} /> Выплатить
            </Button>
          )}
          {isAccountant && row.status !== PayrollEntryStatus.Paid && (
            <Button size="sm" variant="outline" onClick={() => setAdjustTarget(row)}>
              <Settings2 size={13} /> Корректировка
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
      title="Начисления зарплаты"
      subtitle="Реальные данные backend"
      action={
        isAccountant ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Новое начисление
          </Button>
        ) : undefined
      }
    >
      {!isBackendSession ? (
        <BackendSessionRequired roleHint="Owner, Prorab или Accountant" />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">Список начислений</h2>
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
                title="Не удалось загрузить начисления"
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
              <EmptyState icon={Banknote} title="Начислений пока нет" description="Создайте первое начисление" />
            )}
          </div>

          {data && data.totalCount > 0 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              pageSize={PAGE_SIZE}
              total={data.totalCount}
              itemLabel="начислений"
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </Card>
      )}

      {isAccountant && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новое начисление">
          <CreateEntryForm
            onSubmit={(request) => createMutation.mutate(request, { onSuccess: () => setCreateOpen(false) })}
            onCancel={() => setCreateOpen(false)}
            submitting={createMutation.isPending}
          />
        </Modal>
      )}

      <Modal open={Boolean(adjustTarget)} onClose={() => setAdjustTarget(null)} title="Корректировка начисления">
        <AdjustForm
          onSubmit={(amount, reason) =>
            adjustTarget &&
            adjustMutation.mutate(
              { payrollEntryId: adjustTarget.id, request: { adjustmentAmount: amount, adjustmentReason: reason } },
              { onSuccess: () => setAdjustTarget(null) },
            )
          }
          onCancel={() => setAdjustTarget(null)}
          submitting={adjustMutation.isPending}
        />
      </Modal>
    </AppLayout>
  );
}

function CreateEntryForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (request: { workerId: string; periodStart: string; periodEnd: string }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [workerId, setWorkerId] = useState("");
  const [periodStart, setPeriodStart] = useState(() => new Date().toISOString().slice(0, 8) + "01");
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !workerId.trim()) return;
    onSubmit({ workerId: workerId.trim(), periodStart, periodEnd });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="pe-worker-id">
          ID работника
        </label>
        <input id="pe-worker-id" required value={workerId} onChange={(e) => setWorkerId(e.target.value)} placeholder="GUID работника" className={fieldClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="pe-period-start">
            Начало периода
          </label>
          <input id="pe-period-start" type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="pe-period-end">
            Конец периода
          </label>
          <input id="pe-period-end" type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Создание..." : "Создать"}
        </Button>
      </div>
    </form>
  );
}

function AdjustForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (amount: number, reason?: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !amount.trim()) return;
    onSubmit(Number(amount), reason.trim() || undefined);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="adj-amount">
          Сумма корректировки (может быть отрицательной)
        </label>
        <input id="adj-amount" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink" htmlFor="adj-reason">
          Причина
        </label>
        <textarea id="adj-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Сохранение..." : "Применить"}
        </Button>
      </div>
    </form>
  );
}
