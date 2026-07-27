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
import { useLanguage } from "../../context/LanguageContext";
import type { EstimateStatus } from "../../types";

export function EstimateSummary({ estimate, onOpen }: { estimate: Estimate; onOpen?: () => void }) {
  const { strings } = useLanguage();
  const s = strings.estimates;
  const c = strings.common;
  const remaining = estimate.amount - estimate.spent;
  const statusConfig = ESTIMATE_STATUS_CONFIG[estimate.status];
  const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
    draft: s.statusDraft,
    pending_review: s.statusPendingReview,
    approved: s.statusApproved,
  };

  return (
    <Card className="overflow-hidden">
      <PageHeader title={s.summaryTitle} />
      <div className="h-24 w-full overflow-hidden">
        <ObjectImage src={estimate.imageUrl} type={estimate.objectType} alt={estimate.objectName} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-secondary">{s.summaryNumberLabel}</p>
            <p className="text-base font-bold text-ink">{estimate.number}</p>
          </div>
          <Badge tone={statusConfig.tone}>{ESTIMATE_STATUS_LABEL[estimate.status]}</Badge>
        </div>

        <div className="mt-2.5">
          <p className="text-xs text-ink-secondary">{c.colObject}</p>
          <p className="text-sm font-semibold text-ink">{estimate.objectName}</p>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <IconContainer icon={User} tone="blue" size="sm" />
          <div>
            <p className="text-xs text-ink-secondary">{s.colResponsible}</p>
            <p className="text-sm font-semibold text-ink">{estimate.responsible}</p>
            <p className="text-xs text-ink-muted">{estimate.responsibleRole === "Прораб" ? c.roleLabels.prorab : estimate.responsibleRole}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <IconSummaryRow icon={Calendar} label={s.summaryDateCreated} value={formatDateShort(estimate.date)} />
          <IconSummaryRow icon={Clock} label={s.summaryDateUpdated} value={formatDateShort(estimate.updatedDate)} />
        </div>

        <div className="my-3 border-t border-border" />

        <div className="space-y-2">
          <IconSummaryRow icon={Wallet} label={s.summaryTotalBudget} value={formatCurrency(estimate.amount)} />
          <IconSummaryRow icon={PiggyBank} label={c.spentLabel} value={formatCurrency(estimate.spent)} />
          <IconSummaryRow icon={TrendingUp} label={c.remainingBudgetLabel} value={formatCurrency(remaining)} />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-ink-secondary">
            <span>{c.budgetUsageLabel}</span>
            <span className="font-semibold text-ink">{estimate.usagePercent}%</span>
          </div>
          <ProgressBar value={estimate.usagePercent} tone="green" className="mt-2" />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={onOpen}>{s.openEstimateButton}</Button>
          <Button variant="outline">
            <Download size={14} /> {s.downloadPdfButton}
          </Button>
        </div>
      </div>
    </Card>
  );
}
