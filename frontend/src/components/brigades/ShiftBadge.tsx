import { Moon, Sun, CalendarOff, MoonStar } from "lucide-react";
import { SHIFT_CONFIG } from "../../utils/brigadeStatus";
import type { WorkShift } from "../../types";

const SHIFT_ICON: Record<WorkShift, typeof Sun> = {
  day: Sun,
  evening: Moon,
  night: MoonStar,
  day_off: CalendarOff,
};

export function ShiftBadge({ shift }: { shift: WorkShift }) {
  const config = SHIFT_CONFIG[shift];
  const Icon = SHIFT_ICON[shift];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      <Icon size={11} className="shrink-0" />
      {config.label}
    </span>
  );
}
