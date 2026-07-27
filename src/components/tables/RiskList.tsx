import { Clock, FileText, TrendingUp } from "lucide-react";
import type { RiskIcon, RiskItem } from "../../types";
import { IconContainer } from "../ui/IconContainer";
import { Badge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";

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
  const { strings } = useLanguage();
  return (
    <div className="divide-y divide-border px-2 sm:px-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <div key={item.id} className="flex flex-wrap items-start gap-x-3.5 gap-y-2 px-3 py-3.5">
            <IconContainer icon={Icon} tone={SEVERITY_TONE[item.severity]} size="sm" />
            <div className="min-w-35 flex-1">
              <p className="break-words text-sm font-semibold leading-snug text-ink">{item.title}</p>
              <p className="mt-0.5 break-words text-xs leading-snug text-ink-secondary">{item.description}</p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <Badge tone={SEVERITY_TONE[item.severity]} className="px-3 py-1.5 text-sm">
                  {item.badgeLabel}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpen?.(item)}>
                {strings.common.open}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
