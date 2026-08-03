import { Clock, FileText, TrendingUp } from "lucide-react";
import type { RiskIcon, RiskItem } from "../../types";
import { IconContainer } from "../ui/IconContainer";
import { Badge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";

const ICONS: Record<RiskIcon, typeof Clock> = {
  trend: TrendingUp,
  clock: Clock,
  file: FileText,
};

const SEVERITY_TONE = {
  red: "red",
  orange: "orange",
  blue: "blue",
} as const;

export function RiskList({ items, onOpen }: { items: RiskItem[]; onOpen?: (item: RiskItem) => void }) {
  return (
    <div className="divide-y divide-border px-2 sm:px-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <div key={item.id} className="flex items-start gap-3.5 px-3 py-3.5">
            <IconContainer icon={Icon} tone={SEVERITY_TONE[item.severity]} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold leading-snug text-ink">{item.title}</p>
              <p className="mt-0.5 break-words text-xs leading-snug text-ink-secondary">{item.description}</p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <Badge tone={SEVERITY_TONE[item.severity]}>{item.badgeLabel}</Badge>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOpen?.(item)}>
              Открыть
            </Button>
          </div>
        );
      })}
    </div>
  );
}
