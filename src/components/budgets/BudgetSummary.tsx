import { Calendar, Clock, Download, PiggyBank, TrendingUp, User, Wallet } from "lucide-react";
import type { BudgetLine, BudgetLineStatus } from "../../types";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Badge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { IconContainer } from "../ui/IconContainer";
import { IconSummaryRow } from "../ui/IconSummaryRow";
import { ObjectImage } from "../ui/ObjectImage";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/date";
import { BUDGET_STATUS_CONFIG, getBudgetProgressTone } from "../../utils/financeStatus";
import { useLanguage } from "../../context/LanguageContext";

export function BudgetSummary({ budget, onEdit }: { budget: BudgetLine; onEdit?: () => void }) {
  const { strings } = useLanguage();
  const s = strings.budgets;
  const c = strings.common;
  const remaining = budget.totalBudget - budget.spent;
  const usagePercent = Math.round((budget.spent / budget.totalBudget) * 100);
  const statusConfig = BUDGET_STATUS_CONFIG[budget.status];
  const progressTone = getBudgetProgressTone(budget.status, usagePercent);

  const BUDGET_STATUS_LABEL: Record<BudgetLineStatus, string> = {
    in_progress: c.statusInProgress,
    over_budget: s.statusOverBudget,
    completed: c.statusCompleted,
    pending_approval: s.statusPendingApproval,
    draft: c.statusDraft,
  };

  return (
    <Card className="overflow-hidden">
      <PageHeader title={s.summaryTitle} />
      <div className="h-40 w-full overflow-hidden">
        <ObjectImage src={budget.imageUrl} type={budget.objectType} alt={budget.objectName} />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-secondary">{c.colObject}</p>
            <p className="text-base font-bold text-ink">{budget.objectName}</p>
          </div>
          <Badge tone={statusConfig.tone}>{BUDGET_STATUS_LABEL[budget.status]}</Badge>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <IconContainer icon={User} tone="blue" size="sm" />
          <div>
            <p className="text-xs text-ink-secondary">{c.responsibleLabel}</p>
            <p className="text-sm font-semibold text-ink">{budget.responsible}</p>
            <p className="text-xs text-ink-muted">{budget.responsibleRole === "Прораб" ? c.roleLabels.prorab : budget.responsibleRole}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <IconSummaryRow
            icon={Calendar}
            label={s.summaryPeriodLabel}
            value={`${formatDateShort(budget.periodStart)} – ${formatDateShort(budget.periodEnd)}`}
          />
          <IconSummaryRow icon={Calendar} label={c.dateCreatedLabel} value={formatDateShort(budget.createdDate)} />
          <IconSummaryRow icon={Clock} label={s.summaryUpdatedDate} value={formatDateShort(budget.updatedDate)} />
        </div>

        <div className="my-4 border-t border-border" />

        <div className="space-y-2.5">
          <IconSummaryRow icon={Wallet} label={c.totalBudgetLabel} value={formatCurrency(budget.totalBudget)} />
          <IconSummaryRow icon={PiggyBank} label={c.spentLabel} value={formatCurrency(budget.spent)} />
          <IconSummaryRow icon={TrendingUp} label={c.remainingBudgetLabel} value={formatCurrency(Math.max(0, remaining))} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>{c.budgetUsageLabel}</span>
            <span className="font-semibold text-ink">{usagePercent}%</span>
          </div>
          <ProgressBar value={Math.min(100, usagePercent)} tone={progressTone} className="mt-2" />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button onClick={onEdit}>{s.editBudgetButton}</Button>
          <Button variant="outline">
            <Download size={14} /> {s.exportPdfButton}
          </Button>
        </div>
      </div>
    </Card>
  );
}
