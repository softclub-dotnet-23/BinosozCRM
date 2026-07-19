import { HardHat } from "lucide-react";
import { cn } from "../../utils/cn";

const TONE_CYCLE = [
  "bg-primary-soft text-primary",
  "bg-blue-soft text-blue",
  "bg-green-soft text-green",
  "bg-purple-soft text-purple",
  "bg-primary-soft text-primary",
  "bg-[#EDF1F5] text-[#5B7083]",
];

export function BrigadeIcon({ number, size = "md" }: { number: number; size?: "sm" | "md" }) {
  const toneClass = TONE_CYCLE[(number - 1) % TONE_CYCLE.length];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "md" ? "h-11 w-11" : "h-9 w-9",
        toneClass,
      )}
    >
      <HardHat size={size === "md" ? 20 : 16} />
    </div>
  );
}
