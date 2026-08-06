import type { ComponentType } from "react";
import { cn } from "../../utils/cn";

type IconTone = "orange" | "blue" | "green" | "purple" | "red";

const TONE_CLASSNAMES: Record<IconTone, string> = {
  orange: "bg-primary-soft text-primary",
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green",
  purple: "bg-purple-soft text-purple",
  red: "bg-red-soft text-red",
};

interface IconContainerProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: IconTone;
  size?: "sm" | "md";
}

export function IconContainer({ icon: Icon, tone, size = "md" }: IconContainerProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "md" ? "h-12 w-12" : "h-9 w-9",
        TONE_CLASSNAMES[tone],
      )}
    >
      <Icon size={size === "md" ? 22 : 17} />
    </div>
  );
}
