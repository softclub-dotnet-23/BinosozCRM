import type { ReactNode, SVGProps } from "react";
import { cn } from "../../utils/cn";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function IconBase({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function UsersIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}
export function ClipboardIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2M9 10l2 2 4-4M9 16h6" />
    </IconBase>
  );
}
export function CheckIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </IconBase>
  );
}
export function BoxIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="m3 7 9 5 9-5M12 12v9M4 7l8-5 8 5v10l-8 5-8-5Z" />
    </IconBase>
  );
}
export function BuildingIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M4 21V4h10v17M14 9h6v12M7 8h3M7 12h3M7 16h3M17 13h1M17 17h1M2 21h20" />
    </IconBase>
  );
}
export function BoltIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="m13 2-8 12h7l-1 8 8-12h-7Z" />
    </IconBase>
  );
}
export function WallIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M3 5h18v14H3zM3 10h18M3 15h18M8 5v5M16 5v5M6 10v5M14 10v5M9 15v4M18 15v4" />
    </IconBase>
  );
}
export function ClockIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}
export function AlertIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M10.3 3.7 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </IconBase>
  );
}
export function PlusIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}
export function UserIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </IconBase>
  );
}
export function CalendarIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </IconBase>
  );
}
export function MoreIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="5" cy="12" r=".7" fill="currentColor" />
      <circle cx="12" cy="12" r=".7" fill="currentColor" />
      <circle cx="19" cy="12" r=".7" fill="currentColor" />
    </IconBase>
  );
}

export function UserXIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <path d="m17 8 4 4M21 8l-4 4" />
    </IconBase>
  );
}
export function RebarIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="m4 17 13-13 3 3L7 20l-3-3Z" />
      <path d="m2 13 10-10 2 2L4 15l-2-2ZM9 22l13-13-2-2L7 20l2 2Z" />
      <path d="m6 15 3 3M10 11l3 3M14 7l3 3M4 11l2 2M9 6l2 2" />
    </IconBase>
  );
}
export function WalkingPersonIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="10" cy="4" r="2" />
      <path d="m8 8 4 1 2 5M10 9l-1 6-3 6M9 15l5 6M12 10l5 3" />
      <path d="m17 9 3 12M16 21h6M16 11l4-2" />
    </IconBase>
  );
}
export function HammerIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M14 6.5 17.5 10 9 18.5a2.1 2.1 0 0 1-3-3L14 6.5Z" />
      <path d="m17 3 4 4-2.5 2.5-4-4L17 3Z" />
    </IconBase>
  );
}
export function WheelbarrowIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="7" cy="19" r="2" />
      <path d="M9 19h8l3-8H9l-2-5H3M17 19h4" />
      <path d="M10 11h10M12 8h6" />
    </IconBase>
  );
}
export function WelderSparkIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="3" y="4" width="11" height="16" rx="2" />
      <path d="M6 8h5M8.5 12v4M17 9v7M17 12h3M20 10v4M16 20h5" />
      <circle cx="17" cy="7" r="1.5" />
    </IconBase>
  );
}
export function MasterIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="8" r="3" />
      <path d="M8 7a4 4 0 0 1 8 0M7 7h10M5 21a7 7 0 0 1 14 0M9 15l3 3 3-3" />
    </IconBase>
  );
}
export function PhoneIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5V19a2 2 0 0 1-2.2 2A15.8 15.8 0 0 1 3 5.2 2 2 0 0 1 5 4Z" />
    </IconBase>
  );
}
export function TrowelIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 9h16M4 14h16M4 19h16" />
    </IconBase>
  );
}
export function PipeIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M3 8h5a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h5" />
      <circle cx="5.5" cy="8" r="2.5" />
      <circle cx="18.5" cy="16" r="2.5" />
    </IconBase>
  );
}
export function PlasterIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="3" y="3" width="13" height="6" rx="1.5" />
      <path d="M9.5 9v4M9.5 13H14a2 2 0 0 1 2 2v5" />
    </IconBase>
  );
}
export function WindowIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M12 4v16M4 12h16" />
    </IconBase>
  );
}
export function HourglassIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M6 2h12M6 22h12" />
      <path d="M7 2c0 5.5 4.5 6.5 5 8-.5 1.5-5 2.5-5 8M17 2c0 5.5-4.5 6.5-5 8 .5 1.5 5 2.5 5 8" />
    </IconBase>
  );
}
export function FileIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M7 3h7l4 4v14H7Z" />
      <path d="M14 3v4h4M9 13h6M9 17h6" />
    </IconBase>
  );
}
export function HistoryIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3" />
      <path d="M3 4v4.5h4.5M12 8v4.5l3 2" />
    </IconBase>
  );
}
export function EyeIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}
export function BarChartIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M6 20v-6M12 20V6M18 20v-9M3 20h18" />
    </IconBase>
  );
}
export function ChevronDownIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}
export function WalletIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
      <path d="M15 12h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a2 2 0 0 1 0-4Z" />
    </IconBase>
  );
}
export function DocumentIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M7 3h7l4 4v14H7Z" />
      <path d="M14 3v4h4M9 12h6M9 16h4" />
      <circle cx="16.5" cy="16.5" r="2.5" />
      <path d="m18.3 18.3 1.2 1.2" />
    </IconBase>
  );
}
export function DownloadIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </IconBase>
  );
}
export function BriefcaseIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </IconBase>
  );
}
export function MailIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" />
    </IconBase>
  );
}
export function PencilIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M15.5 3.5 20 8l-11 11H5v-4Z" />
      <path d="m14 5 5 5" />
    </IconBase>
  );
}
export function CameraIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M4 8h3l2-2h6l2 2h3v11H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </IconBase>
  );
}
export function ExternalLinkIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M14 4h6v6M20 4l-9 9M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" />
    </IconBase>
  );
}

export const tone: Record<string, string> = {
  blue: "bg-blue-soft text-blue",
  orange: "bg-warning-soft text-warning",
  green: "bg-green-soft text-green",
  red: "bg-red-soft text-red",
  purple: "bg-purple-soft text-purple",
  gray: "bg-surface-3 text-ink-secondary",
};

const INITIAL_COLORS = ["#e0e7ff", "#fee2e2", "#dcfce7", "#fef3c7", "#f3e8ff", "#e0f2fe"];

/** Real photo when one exists for this mock person; otherwise a colored initials
 * circle (same visual weight as a photo, so rows without a portrait don't stand out). */
export function PersonAvatar({ name, photo, size = 32 }: { name: string; photo?: string; size?: number }) {
  if (photo) {
    return (
      <img
        src={`/images/people/${photo}`}
        alt=""
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const colorIndex = name.charCodeAt(0) % INITIAL_COLORS.length;
  return (
    <span
      style={{ width: size, height: size, background: INITIAL_COLORS[colorIndex] }}
      className="flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-slate-700"
    >
      {initials}
    </span>
  );
}

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("rounded-xl border border-border bg-white shadow-[0_2px_12px_rgba(15,23,42,.045)]", className)}>
      {children}
    </section>
  );
}

export function CardHeader({ children, onMore }: { children: ReactNode; onMore?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
      <h2 className="text-[15px] font-bold">{children}</h2>
      <button type="button" aria-label="Дополнительные действия" onClick={onMore} className="rounded-md p-1 text-ink-muted hover:bg-[#f6f6f5]">
        <MoreIcon size={18} />
      </button>
    </div>
  );
}

export function Badge({ children, color }: { children: ReactNode; color: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-md px-1.5 py-1 text-[10px] font-bold", tone[color])}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-blue" style={{ width: `${value}%` }} />
    </div>
  );
}

const TREND_TEXT_COLOR: Record<string, string> = {
  blue: "text-blue",
  orange: "text-warning",
  green: "text-green",
  red: "text-red",
  purple: "text-purple",
  gray: "text-ink-secondary",
};

export function KpiCard({
  label,
  value,
  note,
  color,
  icon: Icon,
  trend,
  trendIcon = "up",
  trendColor,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
  icon: (p: IconProps) => ReactNode;
  /** Optional second line under the value, e.g. "2 к прошлому периоду" — rendered
   * with an up/down arrow, colored via `trendColor` instead of the plain muted `note`. */
  trend?: string;
  trendIcon?: "up" | "down";
  trendColor?: string;
}) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-ink-secondary">{label}</p>
          <p className="mt-1.5 text-[22px] font-extrabold tracking-tight">{value}</p>
          {note && <p className="mt-1 text-[11px] text-ink-muted">{note}</p>}
          {trend && (
            <p className={cn("mt-1 text-[11px] font-semibold", TREND_TEXT_COLOR[trendColor ?? "green"])}>
              {trendIcon === "up" ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", tone[color])}>
          <Icon size={21} />
        </div>
      </div>
    </Card>
  );
}
