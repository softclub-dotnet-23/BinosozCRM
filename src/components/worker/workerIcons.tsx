import {
  Bell,
  BrickWall,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Package,
  PaintRoller,
  Paintbrush,
  PanelsTopLeft,
  Pencil,
  TriangleAlert,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Work, WorkerDocumentType, WorkerNotificationType } from "../../types";

const KEYWORD_ICONS: [string, LucideIcon][] = [
  ["кладка", BrickWall],
  ["кирпич", BrickWall],
  ["трубопровод", Wrench],
  ["сантех", Wrench],
  ["канализац", Wrench],
  ["водоснаб", Wrench],
  ["штукатур", Paintbrush],
  ["шпаклёв", Paintbrush],
  ["электро", Zap],
  ["провод", Zap],
  ["покраск", PaintRoller],
  ["окраск", PaintRoller],
  ["окон", PanelsTopLeft],
  ["окна", PanelsTopLeft],
  ["остеклен", PanelsTopLeft],
];

/** Real work titles are matched against real trade keywords to pick a representative Lucide icon
 * — the same honest keyword-classification technique already used for material categories
 * (categorizeMaterialName) — falling back to a generic clipboard icon for titles that don't match
 * one of the specific trades above. */
export function pickWorkIcon(work: Work): LucideIcon {
  const lower = `${work.title} ${work.sectionName}`.toLowerCase();
  for (const [keyword, Icon] of KEYWORD_ICONS) {
    if (lower.includes(keyword)) return Icon;
  }
  return ClipboardList;
}

/** Shared between the Dashboard's notification list and the full Notifications page, so both
 * render the same icon/color per type instead of drifting apart. */
export const NOTIFICATION_ICON: Record<WorkerNotificationType, LucideIcon> = {
  task_assigned: ListChecks,
  materials_delivered: Package,
  task_completed: CheckCircle2,
  task_review: ListChecks,
  problem_update: TriangleAlert,
  schedule_change: CalendarClock,
  photo_report_approved: CheckCircle2,
  photo_report_rejected: TriangleAlert,
  reminder: CalendarClock,
  system: Bell,
};

export const NOTIFICATION_TONE_CLASS: Record<WorkerNotificationType, string> = {
  task_assigned: "bg-primary-soft text-primary",
  materials_delivered: "bg-blue-soft text-blue",
  task_completed: "bg-green-soft text-green",
  task_review: "bg-purple-soft text-purple",
  problem_update: "bg-red-soft text-red",
  schedule_change: "bg-warning-soft text-warning",
  photo_report_approved: "bg-green-soft text-green",
  photo_report_rejected: "bg-red-soft text-red",
  reminder: "bg-blue-soft text-blue",
  system: "bg-surface-4 text-ink-secondary",
};

/** Shared between the Dashboard's document grid and the full Documents page — each real file
 * type gets its own icon and color instead of every document looking identical. */
export const DOCUMENT_ICON: Record<WorkerDocumentType, LucideIcon> = {
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  drawing: Pencil,
  image: Camera,
};

export const DOCUMENT_TONE_CLASS: Record<WorkerDocumentType, string> = {
  pdf: "bg-red-soft text-red",
  spreadsheet: "bg-green-soft text-green",
  drawing: "bg-blue-soft text-blue",
  image: "bg-purple-soft text-purple",
};
