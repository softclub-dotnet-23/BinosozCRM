import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { formatCurrency, formatNumber } from "../../utils/format";
import { useToast } from "../../hooks/useToast";
import type { PayrollSummary } from "../../types";

export function PayrollCard({ summary }: { summary: PayrollSummary }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState(summary.status);
  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [comment, setComment] = useState("");

  if (status === "approved") {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
          <CheckCircle2 size={28} />
        </div>
        <p className="text-base font-bold text-ink">Зарплата утверждена</p>
        <p className="text-sm text-ink-secondary">
          Период: {summary.period} · К выплате {formatCurrency(summary.toPay)}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[17px] font-bold text-ink">Зарплата к утверждению</h2>

      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Период:" value={summary.period} />
        <Row label="Количество сотрудников:" value={formatNumber(summary.employeeCount)} />
        <Row label="Начислено:" value={formatCurrency(summary.accrued)} />
        <Row label="Удержания:" value={formatCurrency(summary.deductions)} />
      </dl>

      <div className="my-4 border-t border-border" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Итого к выплате:</span>
        <span className="text-lg font-bold text-primary tabular">{formatCurrency(summary.toPay)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Avatar name={summary.preparedBy.split(" — ").pop() ?? summary.preparedBy} size="sm" className="h-4 w-4 text-[8px]" />
        Подготовил: {summary.preparedBy}
      </div>

      {status === "returned" && (
        <p className="mt-3 rounded-lg bg-red-soft px-3 py-2 text-xs font-medium text-red">
          Возвращено бухгалтеру на доработку
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Button className="flex-1" onClick={() => setApproveOpen(true)}>
          Утвердить зарплату
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setReturnOpen(true)}>
          Вернуть бухгалтеру
        </Button>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Утвердить зарплату?"
        description={`Период: ${summary.period}. Итого к выплате: ${formatCurrency(summary.toPay)}.`}
        confirmLabel="Утвердить"
        onConfirm={() => {
          setStatus("approved");
          showToast("Зарплата утверждена");
        }}
      />

      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Вернуть бухгалтеру"
        description="Опишите, что нужно исправить перед повторной проверкой."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setStatus("returned");
                setReturnOpen(false);
                showToast("Расчёт возвращён бухгалтеру", "info");
                setComment("");
              }}
            >
              Вернуть
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-ink" htmlFor="return-comment">
          Комментарий
        </label>
        <textarea
          id="return-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Например: пересчитать удержания по бригаде №3"
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
