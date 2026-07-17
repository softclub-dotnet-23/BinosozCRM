import { AlertTriangle, PiggyBank, Wallet2, TrendingUp } from "lucide-react";
import { IconContainer } from "../ui/IconContainer";
import { formatCurrency } from "../../utils/format";

interface BudgetSummaryBlocksProps {
  totalBudget: number;
  actualSpent: number;
  remaining: number;
  overBudget: number;
}

export function BudgetSummaryBlocks({ totalBudget, actualSpent, remaining, overBudget }: BudgetSummaryBlocksProps) {
  const items = [
    { icon: Wallet2, tone: "blue" as const, label: "Общий бюджет", value: totalBudget },
    { icon: PiggyBank, tone: "orange" as const, label: "Фактические расходы", value: actualSpent },
    { icon: TrendingUp, tone: "green" as const, label: "Остаток", value: remaining },
    { icon: AlertTriangle, tone: "red" as const, label: "Превышение бюджета", value: overBudget },
  ];

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
          <IconContainer icon={item.icon} tone={item.tone} size="sm" />
          <div className="min-w-0">
            <p className="text-xs text-ink-secondary">{item.label}</p>
            <p className="truncate text-base font-bold text-ink tabular">{formatCurrency(item.value)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
