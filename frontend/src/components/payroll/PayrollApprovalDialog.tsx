import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { PayrollStatusBadge } from "./PayrollStatusBadge";
import { formatCurrency } from "../../utils/format";
import type { PayrollRecord } from "../../types";

interface PayrollApprovalDialogProps {
  open: boolean;
  record: PayrollRecord | null;
  onClose: () => void;
  onApprove: (paymentDate: string) => void;
  onReturn: () => void;
}

export function PayrollApprovalDialog({ open, record, onClose, onApprove, onReturn }: PayrollApprovalDialogProps) {
  const [paymentDate, setPaymentDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const d = new Date();
      d.setMonth(d.getMonth() + 1, 1);
      setPaymentDate(d.toISOString().slice(0, 10));
      setError("");
    }
  }, [open]);

  if (!record) return null;

  function handleApprove() {
    if (!paymentDate) {
      setError("Укажите планируемую дату выплаты");
      return;
    }
    onApprove(paymentDate);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Утверждение зарплаты"
      description={`${record.employeeName} · ${record.periodLabel}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onReturn}>
            Вернуть на доработку
          </Button>
          <Button onClick={handleApprove}>Утвердить</Button>
        </>
      }
    >
      <dl className="space-y-2.5 text-sm">
        <Row label="Сотрудник" value={record.employeeName} />
        <Row label="Период" value={record.periodLabel} />
        <Row label="Начислено" value={formatCurrency(record.totalAccrued)} />
        <Row label="Удержания" value={formatCurrency(record.totalDeductions)} />
      </dl>
      <div className="mt-3 flex items-center justify-between rounded-[10px] bg-primary-soft px-4 py-3">
        <span className="text-sm font-semibold text-ink">К выплате</span>
        <span className="text-lg font-bold text-primary tabular">{formatCurrency(record.netPayable)}</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-ink-secondary">Текущий статус</span>
        <PayrollStatusBadge status={record.status} />
      </div>

      <label className="mt-4 block text-sm font-medium text-ink" htmlFor="approval-payment-date">
        Планируемая дата выплаты
      </label>
      <input
        id="approval-payment-date"
        type="date"
        value={paymentDate}
        onChange={(e) => {
          setPaymentDate(e.target.value);
          setError("");
        }}
        className="mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
    </Modal>
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
