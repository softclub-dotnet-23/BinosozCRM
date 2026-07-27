import { Box, Clock, Users, Zap } from "lucide-react";
import type { AlertIcon, AttentionItem } from "../../types";
import { IconContainer } from "../ui/IconContainer";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";
import { useLanguage } from "../../context/LanguageContext";

const ICONS: Record<AlertIcon, typeof Clock> = {
  clock: Clock,
  bolt: Zap,
  box: Box,
  users: Users,
};

const SEVERITY_TONE = {
  red: "red",
  orange: "orange",
  blue: "blue",
} as const;

const ICON_TONE = {
  red: "red",
  orange: "orange",
  blue: "blue",
} as const;

export function AttentionList({ items, onOpen }: { items: AttentionItem[]; onOpen?: (item: AttentionItem) => void }) {
  const { strings } = useLanguage();
  return (
    <div className="divide-y divide-border px-2 sm:px-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <div key={item.id} className="flex flex-wrap items-start gap-x-3.5 gap-y-2 px-3 py-3.5">
            <IconContainer icon={Icon} tone={ICON_TONE[item.severity] as "red" | "orange" | "blue"} size="sm" />
            <div className="min-w-35 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
              <p className="truncate text-xs text-ink-secondary">{item.objectName}</p>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-muted">
                <Avatar name={item.responsible} size="sm" className="h-4 w-4 text-[8px]" />
                {item.responsible}
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <Badge tone={SEVERITY_TONE[item.severity]}>{item.alertLabel}</Badge>
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
