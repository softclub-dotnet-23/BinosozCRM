import { AlertTriangle, Banknote, Calendar, Download, FileText, Pencil, Printer, Users2, Wallet, XCircle } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { PayrollStatusBadge } from "./PayrollStatusBadge";
import { formatCurrency } from "../../utils/format";
import { formatDateShort, formatDateTimeShort } from "../../utils/date";
import { useToast } from "../../hooks/useToast";
import {
  canApprovePayroll,
  canCancelPayroll,
  canEditPayroll,
  canFlagForReview,
  canMarkAsPaid,
  canResolveReview,
  canReturnPayroll,
  canSubmitForApproval,
} from "../../utils/payrollPermissions";
import type { PayrollRecord, PayrollRole } from "../../types";

interface PayrollDetailDrawerProps {
  record: PayrollRecord | null;
  role: PayrollRole;
  onClose: () => void;
  onEdit: (record: PayrollRecord) => void;
  onSubmit: (record: PayrollRecord) => void;
  onFlagReview: (record: PayrollRecord) => void;
  onResolveReview: (record: PayrollRecord) => void;
  onApprove: (record: PayrollRecord) => void;
  onReturn: (record: PayrollRecord) => void;
  onMarkPaid: (record: PayrollRecord) => void;
  onCancel: (record: PayrollRecord) => void;
}

export function PayrollDetailDrawer({
  record,
  role,
  onClose,
  onEdit,
  onSubmit,
  onFlagReview,
  onResolveReview,
  onApprove,
  onReturn,
  onMarkPaid,
  onCancel,
}: PayrollDetailDrawerProps) {
  const { showToast } = useToast();

  function handleDownloadPayslip() {
    if (!record) return;
    const lines = [
      "BINOSOZ — Расчётный лист",
      `Сотрудник: ${record.employeeName}`,
      `Должность: ${record.position}`,
      `Подразделение: ${record.brigadeName ?? record.department ?? "—"}`,
      `Период: ${record.periodLabel}`,
      "",
      `Оклад: ${formatCurrency(record.baseSalary)}`,
      `Отработано дней: ${record.workedDays} из ${record.totalDays}`,
      `Сверхурочные (${record.overtimeHours} ч): ${formatCurrency(record.overtimeAmount)}`,
      `Премии: ${formatCurrency(record.bonuses)}`,
      `Надбавки: ${formatCurrency(record.allowances)}`,
      `Начислено: ${formatCurrency(record.totalAccrued)}`,
      "",
      `Удержание за неявки: ${formatCurrency(record.absenceDeduction)}`,
      `Подоходный налог: ${formatCurrency(record.taxDeduction)}`,
      `Удержание аванса: ${formatCurrency(record.advanceDeduction)}`,
      `Прочие удержания: ${formatCurrency(record.otherDeductions)}`,
      `Удержано: ${formatCurrency(record.totalDeductions)}`,
      "",
      `К выплате: ${formatCurrency(record.netPayable)}`,
      "",
      `Статус: ${record.status}`,
      `Дата выплаты: ${record.paymentDate ? formatDateShort(record.paymentDate) : "—"}`,
      `Подготовил: ${record.preparedBy}`,
      record.approvedBy ? `Утвердил: ${record.approvedBy}` : "",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `raschetny-list-${record.employeeName.replace(/\s+/g, "-")}-${record.periodStart}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Расчётный лист скачан");
  }

  return (
    <Drawer open={Boolean(record)} onClose={onClose} title="Начисление зарплаты">
      {record && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={record.employeeName} size="md" className="h-14 w-14 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{record.employeeName}</p>
              <p className="text-sm text-ink-secondary">{record.position}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <PayrollStatusBadge status={record.status} />
            <span className="text-xs text-ink-muted">№{record.number}</span>
          </div>

          <dl className="space-y-2.5 text-sm">
            <Row icon={Users2} label="Бригада / Отдел">
              {record.brigadeName ?? record.department ?? "—"}
            </Row>
            <Row icon={Calendar} label="Период">
              {record.periodLabel}
            </Row>
            {!record.attendanceDataMissing && (
              <Row icon={Wallet} label="Отработано">
                {record.workedDays} из {record.totalDays} дней
              </Row>
            )}
          </dl>

          {record.attendanceDataMissing && (
            <div className="flex items-start gap-2.5 rounded-lg bg-warning-soft px-3.5 py-2.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="text-xs font-semibold text-warning">Нет данных посещаемости</p>
                <p className="mt-1 text-sm text-ink">
                  За этот период не найдено ни одной отметки посещаемости для этого сотрудника — удержание за неявки не
                  применялось. Проверьте вручную перед утверждением.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-[10px] border border-border-strong px-4 py-3 text-sm">
            <RowValue label="Оклад" value={formatCurrency(record.baseSalary)} />
            {record.overtimeAmount > 0 && <RowValue label={`Сверхурочные (${record.overtimeHours} ч)`} value={formatCurrency(record.overtimeAmount)} />}
            {record.bonuses > 0 && <RowValue label="Премии" value={formatCurrency(record.bonuses)} />}
            {record.allowances > 0 && <RowValue label="Надбавки" value={formatCurrency(record.allowances)} />}
            <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
              <span className="font-semibold text-ink">Начислено</span>
              <span className="font-bold text-ink tabular">{formatCurrency(record.totalAccrued)}</span>
            </div>
          </div>

          <div className="rounded-[10px] border border-border-strong px-4 py-3 text-sm">
            {record.absenceDeduction > 0 && <RowValue label="Неявки" value={formatCurrency(record.absenceDeduction)} />}
            <RowValue label="Подоходный налог" value={formatCurrency(record.taxDeduction)} />
            {record.advanceDeduction > 0 && <RowValue label="Аванс" value={formatCurrency(record.advanceDeduction)} />}
            {record.otherDeductions > 0 && <RowValue label="Прочие удержания" value={formatCurrency(record.otherDeductions)} />}
            <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
              <span className="font-semibold text-ink">Удержано</span>
              <span className="font-bold text-red tabular">{formatCurrency(record.totalDeductions)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[10px] bg-primary-soft px-4 py-3">
            <span className="text-sm font-semibold text-ink">К выплате</span>
            <span className="text-lg font-bold text-primary tabular">{formatCurrency(record.netPayable)}</span>
          </div>

          {record.status === "returned" && record.returnReason && (
            <div className="rounded-lg bg-red-soft px-3.5 py-2.5">
              <p className="text-xs font-semibold text-red">Причина возврата</p>
              <p className="mt-1 text-sm text-ink">{record.returnReason}</p>
            </div>
          )}

          {record.paymentDate && (
            <dl className="space-y-1.5 text-sm">
              <Row icon={Banknote} label="Дата выплаты">
                {formatDateShort(record.paymentDate)}
                {record.paymentMethod ? ` · ${record.paymentMethod}` : ""}
              </Row>
            </dl>
          )}

          <div className="border-t border-border pt-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <FileText size={12} /> Подготовил {record.preparedBy} · {formatDateTimeShort(record.preparedAt)}
            </div>
            {record.approvedBy && (
              <div className="mt-1 flex items-center gap-1.5">
                <FileText size={12} /> Утвердил {record.approvedBy}
                {record.approvedAt ? ` · ${formatDateTimeShort(record.approvedAt)}` : ""}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2.5 text-sm font-bold text-ink">История статусов</p>
            <div className="space-y-2">
              {record.statusHistory.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{h.comment || h.status}</p>
                    <p className="text-ink-muted">{h.actor}</p>
                  </div>
                  <span className="shrink-0 text-ink-muted">{formatDateTimeShort(h.date)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            {canEditPayroll(role, record.status) && (
              <Button variant="secondary" size="sm" onClick={() => onEdit(record)}>
                <Pencil size={14} /> Редактировать
              </Button>
            )}
            {canFlagForReview(role, record.status) && (
              <Button variant="outline" size="sm" onClick={() => onFlagReview(record)}>
                На проверку
              </Button>
            )}
            {canResolveReview(role, record.status) && (
              <Button variant="secondary" size="sm" onClick={() => onResolveReview(record)}>
                Проверено
              </Button>
            )}
            {canSubmitForApproval(role, record.status) && (
              <Button size="sm" onClick={() => onSubmit(record)}>
                Отправить на утверждение
              </Button>
            )}
            {canApprovePayroll(role, record.status) && (
              <Button size="sm" onClick={() => onApprove(record)}>
                Утвердить
              </Button>
            )}
            {canReturnPayroll(role, record.status) && (
              <Button variant="outline" size="sm" onClick={() => onReturn(record)}>
                Вернуть на доработку
              </Button>
            )}
            {canMarkAsPaid(role, record.status) && (
              <Button size="sm" onClick={() => onMarkPaid(record)}>
                Отметить как выплачено
              </Button>
            )}
            {canCancelPayroll(role, record.status) && (
              <Button variant="danger" size="sm" onClick={() => onCancel(record)}>
                <XCircle size={14} /> Отменить
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleDownloadPayslip}>
              <Download size={14} /> Расчётный лист
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Печать
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Calendar; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-secondary">{label}</dt>
        <dd className="text-ink">{children}</dd>
      </div>
    </div>
  );
}

function RowValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-semibold text-ink tabular">{value}</span>
    </div>
  );
}
