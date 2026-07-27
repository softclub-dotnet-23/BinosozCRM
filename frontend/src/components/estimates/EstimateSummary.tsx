import { Calendar, Clock, Download, PiggyBank, TrendingUp, User, Wallet } from "lucide-react";
import type { Estimate } from "../../types";
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
import { ESTIMATE_STATUS_CONFIG } from "../../utils/financeStatus";

export function EstimateSummary({ estimate, onOpen }: { estimate: Estimate; onOpen?: () => void }) {
  const remaining = estimate.amount - estimate.spent;
  const statusConfig = ESTIMATE_STATUS_CONFIG[estimate.status];

  return (
    <Card className="overflow-hidden">
      <PageHeader title="Сводка по выбранной смете" />
      <div className="h-40 w-full overflow-hidden">
        <ObjectImage src={estimate.imageUrl} type={estimate.objectType} alt={estimate.objectName} />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-secondary">Смета №</p>
            <p className="text-base font-bold text-ink">{estimate.number}</p>
          </div>
          <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
        </div>

        <div className="mt-3">
          <p className="text-xs text-ink-secondary">Объект</p>
          <p className="text-sm font-semibold text-ink">{estimate.objectName}</p>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <IconContainer icon={User} tone="blue" size="sm" />
          <div>
            <p className="text-xs text-ink-secondary">Ответственный</p>
            <p className="text-sm font-semibold text-ink">{estimate.responsible}</p>
            <p className="text-xs text-ink-muted">{estimate.responsibleRole}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <IconSummaryRow icon={Calendar} label="Дата создания" value={formatDateShort(estimate.date)} />
          <IconSummaryRow icon={Clock} label="Дата обновления" value={formatDateShort(estimate.updatedDate)} />
        </div>

        <div className="my-4 border-t border-border" />

        <div className="space-y-2.5">
          <IconSummaryRow icon={Wallet} label="Общий бюджет" value={formatCurrency(estimate.amount)} />
          <IconSummaryRow icon={PiggyBank} label="Потрачено" value={formatCurrency(estimate.spent)} />
          <IconSummaryRow icon={TrendingUp} label="Остаток бюджета" value={formatCurrency(remaining)} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>Использование бюджета</span>
            <span className="font-semibold text-ink">{estimate.usagePercent}%</span>
          </div>
          <ProgressBar value={estimate.usagePercent} tone="green" className="mt-2" />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Button onClick={onOpen}>Открыть смету</Button>
          <Button variant="outline">
            <Download size={14} /> Скачать PDF
          </Button>
        </div>
      </div>
    </Card>
  );
}
