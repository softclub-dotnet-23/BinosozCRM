import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { formatCurrency, formatNumber } from "../../utils/format";
import { useLanguage } from "../../context/LanguageContext";
import type { PayrollSummary } from "../../types";

interface PayrollCardProps {
  summary: PayrollSummary;
  onApprove: () => void;
  onReturn: (comment: string) => void;
}

export function PayrollCard({ summary, onApprove, onReturn }: PayrollCardProps) {
  const { strings } = useLanguage();
  const d = strings.dashboard;
  const status = summary.status;
  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [comment, setComment] = useState("");

  if (status === "approved") {
    return (
      <Card className="min-w-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
          <CheckCircle2 size={28} />
        </div>
        <p className="text-base font-bold text-ink">{d.payrollApprovedTitle}</p>
        <p className="text-sm text-ink-secondary">
          {d.payrollPeriod(summary.period)} · {d.payrollToPay(formatCurrency(summary.toPay))}
        </p>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">{d.payrollToApproveTitle}</h2>

      <dl className="mt-4 space-y-3 text-sm">
        <Row label={d.payrollPeriodLabel} value={summary.period} />
        <Row label={d.payrollEmployeeCount} value={formatNumber(summary.employeeCount)} />
        <Row label={d.payrollAccrued} value={formatCurrency(summary.accrued)} />
        <Row label={d.payrollDeductions} value={formatCurrency(summary.deductions)} />
      </dl>

      <div className="my-4 border-t border-border" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{d.payrollTotalToPay}</span>
        <span className="text-lg font-bold text-primary tabular">{formatCurrency(summary.toPay)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Avatar name={summary.preparedBy.split(" — ").pop() ?? summary.preparedBy} size="sm" className="h-4 w-4 text-[8px]" />
        {d.payrollPreparedBy(summary.preparedBy)}
      </div>

      {status === "returned" && (
        <p className="mt-3 rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">
          {d.payrollReturned}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Button className="flex-1" onClick={() => setApproveOpen(true)}>
          {d.payrollApprove}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setReturnOpen(true)}>
          {d.payrollReturnToAccountant}
        </Button>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title={d.payrollApproveConfirmTitle}
        description={d.payrollApproveConfirmDescription(summary.period, formatCurrency(summary.toPay))}
        confirmLabel={d.payrollApproveConfirmLabel}
        onConfirm={onApprove}
      />

      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title={d.payrollReturnModalTitle}
        description={d.payrollReturnModalDescription}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>
              {d.payrollReturnCancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onReturn(comment.trim());
                setReturnOpen(false);
                setComment("");
              }}
            >
              {d.payrollReturnConfirm}
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-ink" htmlFor="return-comment">
          {d.payrollCommentLabel}
        </label>
        <textarea
          id="return-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder={d.payrollCommentPlaceholder}
          className="mt-2 w-full rounded-[10px] border border-border-strong px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </Modal>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="font-semibold text-ink tabular">{value}</dd>
    </div>
  );
}
