import { useMemo, useState } from "react";
import { Download, Eye, Pencil, Plus, RefreshCw, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DonutChart } from "../components/charts/DonutChart";
import { PayrollStatusBadge, PAYROLL_STATUSES, payrollStatusLabel } from "../components/payroll/PayrollStatusBadge";
import { PayrollGenerateModal } from "../components/payroll/PayrollGenerateModal";
import { PayrollFormModal } from "../components/payroll/PayrollFormModal";
import { PayrollPaymentModal } from "../components/payroll/PayrollPaymentModal";
import { PayrollDetailDrawer } from "../components/payroll/PayrollDetailDrawer";
import { PayrollApprovalDialog } from "../components/payroll/PayrollApprovalDialog";
import { PayrollReturnModal } from "../components/payroll/PayrollReturnModal";
import { CustomSelect } from "../components/ui/CustomSelect";
import { payrollRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { canEditPayroll, PAYROLL_ROLE_LABEL, PAYROLL_ROLES } from "../utils/payrollPermissions";
import { computePayrollKpis, computePayrollStatusBuckets, getUpcomingPayments } from "../utils/payrollAnalytics";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import type { PayrollFilters, PayrollRecord, PayrollRole, PayrollStatus } from "../types";

const DEFAULT_FILTERS: PayrollFilters = {
  status: "all",
  brigadeName: "all",
  position: "all",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-31",
};

const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink";

function overlaps(record: PayrollRecord, from: string, to: string): boolean {
  if (from && record.periodEnd < from) return false;
  if (to && record.periodStart > to) return false;
  return true;
}

function nowIso(): string {
  return new Date().toISOString();
}

function withHistory(record: PayrollRecord, status: PayrollStatus, actor: string, comment: string): PayrollRecord {
  const date = nowIso();
  return {
    ...record,
    status,
    updatedAt: date,
    statusHistory: [...record.statusHistory, { id: `${record.id}-${record.statusHistory.length + 1}`, status, date, actor, comment }],
  };
}

export default function PayrollPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useRepositoryState(payrollRepository);
  const [role, setRole] = usePersistentState<PayrollRole>("payroll.role", "accountant");

  const [search, setSearch] = usePersistentState("filters.payroll.search", "");
  const [filters, setFilters] = usePersistentState<PayrollFilters>("filters.payroll.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [approvalRecord, setApprovalRecord] = useState<PayrollRecord | null>(null);
  const [returnRecord, setReturnRecord] = useState<PayrollRecord | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PayrollRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PayrollRecord | null>(null);

  const brigadeOptions = Array.from(
    new Set(records.map((r) => r.brigadeName ?? r.department).filter((v): v is string => Boolean(v))),
  ).sort((a, b) => a.localeCompare(b, "ru"));
  const positionOptions = Array.from(new Set(records.map((r) => r.position))).sort((a, b) => a.localeCompare(b, "ru"));

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((r) => {
      if (query) {
        const haystack = `${r.employeeName} ${r.position} ${r.brigadeName ?? ""} ${r.department ?? ""} ${payrollStatusLabel(r.status)} ${r.periodLabel}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.brigadeName !== "all" && (r.brigadeName ?? r.department) !== filters.brigadeName) return false;
      if (filters.position !== "all" && r.position !== filters.position) return false;
      if (!overlaps(r, filters.dateFrom, filters.dateTo)) return false;
      return true;
    });
  }, [records, search, filters]);

  const kpis = useMemo(() => computePayrollKpis(filteredRecords), [filteredRecords]);
  const statusBuckets = useMemo(() => computePayrollStatusBuckets(filteredRecords), [filteredRecords]);
  const upcoming = useMemo(() => getUpcomingPayments(records, 4), [records]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  }

  function updateRecord(id: string, patch: Partial<PayrollRecord> | ((r: PayrollRecord) => PayrollRecord)) {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r)),
    );
  }

  function currentActorName(): string {
    return role === "owner" ? "Садди Имомов" : PAYROLL_ROLE_LABEL[role];
  }

  function handleGenerate(newRecords: PayrollRecord[]) {
    setRecords((prev) => [...newRecords, ...prev]);
    setGenerateOpen(false);
    showToast(`Сформировано начислений: ${newRecords.length}`);
  }

  function handleSaveEdit(record: PayrollRecord) {
    updateRecord(record.id, record);
    setEditRecord(null);
    setDetailRecord(null);
    showToast("Начисление обновлено");
  }

  function handleSubmit(record: PayrollRecord) {
    updateRecord(record.id, (r) => ({ ...withHistory(r, "pending_approval", currentActorName(), "Отправлено на утверждение"), submittedAt: nowIso() }));
    setDetailRecord(null);
    showToast("Отправлено на утверждение");
  }

  function handleFlagReview(record: PayrollRecord) {
    updateRecord(record.id, (r) => withHistory(r, "needs_review", currentActorName(), "Отмечено как требующее проверки"));
    setDetailRecord(null);
    showToast("Отмечено на проверку", "info");
  }

  function handleResolveReview(record: PayrollRecord) {
    updateRecord(record.id, (r) => withHistory(r, "prepared", currentActorName(), "Проверка завершена"));
    setDetailRecord(null);
    showToast("Проверка завершена");
  }

  function handleApprove(paymentDate: string) {
    if (!approvalRecord) return;
    const actor = currentActorName();
    updateRecord(approvalRecord.id, (r) => ({
      ...withHistory(r, "approved", actor, "Утверждено"),
      approvedBy: actor,
      approvedAt: nowIso(),
      paymentDate,
    }));
    setApprovalRecord(null);
    setDetailRecord(null);
    showToast("Зарплата утверждена");
  }

  function handleReturnFromApproval() {
    if (!approvalRecord) return;
    setReturnRecord(approvalRecord);
    setApprovalRecord(null);
  }

  function handleConfirmReturn(comment: string) {
    if (!returnRecord) return;
    const actor = currentActorName();
    updateRecord(returnRecord.id, (r) => ({
      ...withHistory(r, "returned", actor, comment),
      returnedBy: actor,
      returnedAt: nowIso(),
      returnReason: comment,
    }));
    setReturnRecord(null);
    setDetailRecord(null);
    showToast("Расчёт возвращён на доработку", "info");
  }

  function handleConfirmPayment(payment: { paymentDate: string; paymentMethod: string; paymentReference: string; note: string }) {
    if (!paymentRecord) return;
    const actor = currentActorName();
    updateRecord(paymentRecord.id, (r) => ({
      ...withHistory(r, "paid", actor, "Выплачено"),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
      paidAt: nowIso(),
      note: payment.note || r.note,
    }));
    setPaymentRecord(null);
    setDetailRecord(null);
    showToast("Зарплата отмечена как выплаченная");
  }

  function handleConfirmCancel() {
    if (!cancelTarget) return;
    updateRecord(cancelTarget.id, (r) => withHistory(r, "cancelled", currentActorName(), "Расчёт отменён"));
    setCancelTarget(null);
    setDetailRecord(null);
    showToast("Расчёт отменён", "info");
  }

  function handleExport() {
    const header = ["№", "Сотрудник", "Должность", "Бригада/Отдел", "Период", "Начислено", "Удержания", "К выплате", "Статус", "Дата выплаты"];
    const rows = filteredRecords.map((r) => [
      r.number,
      r.employeeName,
      r.position,
      r.brigadeName ?? r.department ?? "",
      r.periodLabel,
      r.totalAccrued.toFixed(2),
      r.totalDeductions.toFixed(2),
      r.netPayable.toFixed(2),
      payrollStatusLabel(r.status),
      r.paymentDate ? formatDateShort(r.paymentDate) : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zarplaty.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Зарплаты экспортированы");
  }

  const columns: DataTableColumn<PayrollRecord>[] = [
    { key: "number", header: "№", render: (row) => <span className="text-ink-muted">{row.number}</span> },
    {
      key: "employee",
      header: "Сотрудник",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.employeeName} size="sm" />
          <span className="whitespace-nowrap font-semibold text-ink">{row.employeeName}</span>
        </div>
      ),
    },
    { key: "position", header: "Должность", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.position}</span> },
    {
      key: "brigade",
      header: "Бригада / Отдел",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.brigadeName ?? row.department ?? "—"}</span>,
    },
    { key: "period", header: "Период", render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.periodLabel}</span> },
    {
      key: "accrued",
      header: "Начислено",
      render: (row) => <span className="tabular whitespace-nowrap font-semibold text-ink">{formatNumber(row.totalAccrued)} сомони</span>,
    },
    {
      key: "deductions",
      header: "Удержания",
      render: (row) => <span className="tabular whitespace-nowrap text-red">{formatNumber(row.totalDeductions)} сомони</span>,
    },
    {
      key: "payable",
      header: "К выплате",
      render: (row) => <span className="tabular whitespace-nowrap font-bold text-ink">{formatNumber(row.netPayable)} сомони</span>,
    },
    { key: "status", header: "Статус", render: (row) => <PayrollStatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть начисление" onClick={() => setDetailRecord(row)} className={iconButtonClass}>
            <Eye size={14} />
          </button>
          {canEditPayroll(role, row.status) && (
            <button type="button" aria-label="Редактировать начисление" onClick={() => setEditRecord(row)} className={iconButtonClass}>
              <Pencil size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Зарплаты"
      subtitle="Управление начислениями, удержаниями и выплатами сотрудникам"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setPage(1);
        },
        placeholder: "Поиск по сотрудникам...",
      }}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Всего к выплате" value={formatNumber(kpis.totalPayable)} icon={Wallet} tone="green" footer="сомони" />
            <MetricCard label="Сотрудников" value={String(kpis.employeeCount)} icon={Users} tone="blue" footer="человек" />
            <MetricCard label="Начислено" value={formatNumber(kpis.totalAccrued)} icon={TrendingUp} tone="orange" footer="сомони" />
            <MetricCard label="Удержания" value={formatNumber(kpis.totalDeductions)} icon={TrendingDown} tone="purple" footer="сомони" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-xs text-ink-secondary">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }));
                  setPage(1);
                }}
                className="w-27.5 bg-transparent text-ink focus:outline-none"
              />
              <span>–</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateTo: e.target.value }));
                  setPage(1);
                }}
                className="w-27.5 bg-transparent text-ink focus:outline-none"
              />
            </div>
            <CustomSelect
              size="sm"
              aria-label="Статус"
              value={filters.status}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, status: v as PayrollFilters["status"] }));
                setPage(1);
              }}
              options={[
                { value: "all", label: "Статус: Все" },
                ...PAYROLL_STATUSES.map((s) => ({ value: s, label: payrollStatusLabel(s) })),
              ]}
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Бригада"
              value={filters.brigadeName}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, brigadeName: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Бригада: Все" }, ...brigadeOptions.map((b) => ({ value: b, label: b }))]}
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Должность"
              value={filters.position}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, position: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Должность: Все" }, ...positionOptions.map((p) => ({ value: p, label: p }))]}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
            <Button size="sm" className="h-9" onClick={() => setGenerateOpen(true)}>
              <Plus size={14} /> Сформировать зарплату
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
              <Download size={14} /> Экспорт
            </Button>
            <CustomSelect
              size="sm"
              aria-label="Роль"
              value={role}
              onValueChange={(v) => setRole(v as PayrollRole)}
              options={PAYROLL_ROLES.map((r) => ({ value: r, label: `Роль: ${PAYROLL_ROLE_LABEL[r]}` }))}
            />
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} onRowClick={(row) => setDetailRecord(row)} />
            ) : (
              <EmptyState
                icon={Wallet}
                title="Начисления не найдены"
                description="Измените параметры поиска или сформируйте зарплату за период"
                action={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Сбросить фильтры
                  </Button>
                }
              />
            )}
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredRecords.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="записей"
            />
          </Card>
        </div>

        <div className="flex w-full flex-col gap-4 xl:w-70 xl:shrink-0">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Итоги за период</h2>
            <dl className="mt-3.5 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Сотрудников</dt>
                <dd className="font-bold text-ink tabular">{kpis.employeeCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Начислено</dt>
                <dd className="font-bold text-ink tabular">{formatCurrency(kpis.totalAccrued)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">Удержания</dt>
                <dd className="font-bold text-ink tabular">{formatCurrency(kpis.totalDeductions)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <dt className="font-semibold text-ink">К выплате</dt>
                <dd className="font-bold text-green tabular">{formatCurrency(kpis.totalPayable)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Статусы выплат</h2>
            {statusBuckets.length > 0 ? (
              <>
                <DonutChart
                  data={statusBuckets}
                  centerLabel="Всего"
                  centerValue={String(filteredRecords.length)}
                  size={176}
                  valueFormatter={(value) => formatNumber(value)}
                />
                <ul className="mt-4 w-full space-y-2.5">
                  {statusBuckets.map((bucket) => (
                    <li key={bucket.category} className="flex items-center gap-2.5 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bucket.color }} />
                      <span className="text-ink-secondary">{bucket.category}</span>
                      <span className="ml-auto shrink-0 font-semibold text-ink tabular">
                        {bucket.amount}{" "}
                        <span className="text-ink-muted">
                          ({filteredRecords.length > 0 ? Math.round((bucket.amount / filteredRecords.length) * 1000) / 10 : 0}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">Нет данных для отображения</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Ближайшие выплаты</h2>
            <ul className="mt-3.5 space-y-3">
              {upcoming.length > 0 ? (
                upcoming.map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5">
                    <Avatar name={r.employeeName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{r.employeeName}</p>
                      <p className="truncate text-xs text-ink-secondary">{r.position}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-ink-secondary">{formatDateShort(r.paymentDate!)}</span>
                  </li>
                ))
              ) : (
                <p className="text-sm text-ink-muted">Нет запланированных выплат</p>
              )}
            </ul>
            <button
              type="button"
              onClick={() => {
                setFilters((f) => ({ ...f, status: "approved" }));
                setPage(1);
              }}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Все ближайшие выплаты →
            </button>
          </Card>
        </div>
      </div>

      <PayrollGenerateModal open={generateOpen} existingRecords={records} onClose={() => setGenerateOpen(false)} onGenerate={handleGenerate} />

      <PayrollFormModal open={Boolean(editRecord)} record={editRecord} onClose={() => setEditRecord(null)} onSave={handleSaveEdit} />

      <PayrollDetailDrawer
        record={detailRecord}
        role={role}
        onClose={() => setDetailRecord(null)}
        onEdit={(r) => {
          setDetailRecord(null);
          setEditRecord(r);
        }}
        onSubmit={handleSubmit}
        onFlagReview={handleFlagReview}
        onResolveReview={handleResolveReview}
        onApprove={(r) => {
          setDetailRecord(null);
          setApprovalRecord(r);
        }}
        onReturn={(r) => {
          setDetailRecord(null);
          setReturnRecord(r);
        }}
        onMarkPaid={(r) => {
          setDetailRecord(null);
          setPaymentRecord(r);
        }}
        onCancel={(r) => {
          setDetailRecord(null);
          setCancelTarget(r);
        }}
      />

      <PayrollApprovalDialog
        open={Boolean(approvalRecord)}
        record={approvalRecord}
        onClose={() => setApprovalRecord(null)}
        onApprove={handleApprove}
        onReturn={handleReturnFromApproval}
      />

      <PayrollReturnModal open={Boolean(returnRecord)} record={returnRecord} onClose={() => setReturnRecord(null)} onConfirm={handleConfirmReturn} />

      <PayrollPaymentModal
        open={Boolean(paymentRecord)}
        record={paymentRecord}
        onClose={() => setPaymentRecord(null)}
        onConfirm={handleConfirmPayment}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Отменить расчёт?"
        description={cancelTarget ? `${cancelTarget.employeeName} · ${cancelTarget.periodLabel}` : undefined}
        confirmLabel="Отменить расчёт"
        danger
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </AppLayout>
  );
}
