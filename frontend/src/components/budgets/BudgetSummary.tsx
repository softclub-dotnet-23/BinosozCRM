import { Calendar, Clock, Download, PiggyBank, TrendingUp, User, Wallet } from "lucide-react";
import type { BudgetLine } from "../../types";
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

export function BudgetSummary({ budget, onEdit }: { budget: BudgetLine; onEdit?: () => void }) {
  const remaining = budget.totalBudget - budget.spent;
  const usagePercent = Math.round((budget.spent / budget.totalBudget) * 100);
  const statusConfig = BUDGET_STATUS_CONFIG[budget.status];
  const progressTone = getBudgetProgressTone(budget.status, usagePercent);

  return (
    <Card className="overflow-hidden">
      <PageHeader title="Сводка по выбранному бюджету" />
      <div className="h-40 w-full overflow-hidden">
        <ObjectImage src={budget.imageUrl} type={budget.objectType} alt={budget.objectName} />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-secondary">Объект</p>
            <p className="text-base font-bold text-ink">{budget.objectName}</p>
          </div>
          <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <IconContainer icon={User} tone="blue" size="sm" />
          <div>
            <p className="text-xs text-ink-secondary">Ответственный</p>
            <p className="text-sm font-semibold text-ink">{budget.responsible}</p>
            <p className="text-xs text-ink-muted">{budget.responsibleRole}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <IconSummaryRow
            icon={Calendar}
            label="Период бюджета"
            value={`${formatDateShort(budget.periodStart)} – ${formatDateShort(budget.periodEnd)}`}
          />
          <IconSummaryRow icon={Calendar} label="Дата создания" value={formatDateShort(budget.createdDate)} />
          <IconSummaryRow icon={Clock} label="Последнее обновление" value={formatDateShort(budget.updatedDate)} />
        </div>

        <div className="my-4 border-t border-border" />

        <div className="space-y-2.5">
          <IconSummaryRow icon={Wallet} label="Общий бюджет" value={formatCurrency(budget.totalBudget)} />
          <IconSummaryRow icon={PiggyBank} label="Потрачено" value={formatCurrency(budget.spent)} />
          <IconSummaryRow icon={TrendingUp} label="Остаток бюджета" value={formatCurrency(Math.max(0, remaining))} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>Использование бюджета</span>
            <span className="font-semibold text-ink">{usagePercent}%</span>
          </div>
          <ProgressBar value={Math.min(100, usagePercent)} tone={progressTone} className="mt-2" />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button onClick={onEdit}>Редактировать бюджет</Button>
          <Button variant="outline">
            <Download size={14} /> Экспорт PDF
          </Button>
        </div>
      </div>
    </Card>
  );
}
