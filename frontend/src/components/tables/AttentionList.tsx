import { Box, Clock, Users, Zap } from "lucide-react";
import type { AlertIcon, AttentionItem } from "../../types";
import { IconContainer } from "../ui/IconContainer";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/StatusBadge";
import { Button } from "../ui/Button";

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
  return (
    <div className="divide-y divide-border px-2 sm:px-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <div key={item.id} className="flex items-center gap-3.5 px-3 py-3.5">
            <IconContainer icon={Icon} tone={ICON_TONE[item.severity] as "red" | "orange" | "blue"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
              <p className="truncate text-xs text-ink-secondary">{item.objectName}</p>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-muted">
                <Avatar name={item.responsible} size="sm" className="h-4 w-4 text-[8px]" />
                {item.responsible}
              </div>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <Badge tone={SEVERITY_TONE[item.severity]}>{item.alertLabel}</Badge>
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
