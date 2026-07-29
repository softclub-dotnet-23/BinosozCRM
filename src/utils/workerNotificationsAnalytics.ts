import type { WorkerNotification, WorkerNotificationPriority, WorkerNotificationType } from "../types";

export type NotificationTab = "all" | "unread" | "important" | "system";

export type NotificationCategory = "task" | "materials" | "schedule" | "photoReport" | "reminder" | "system";

/** Groups the real granular WorkerNotificationType values into the broader categories the
 * reference's type filter offers (Задачи/Материалы/График/Фотоотчёты/Напоминания/Системные) — a
 * single filter dimension, not a 1:1 label-per-type mapping that would silently only match the
 * first type sharing a label. */
export const TYPE_CATEGORY: Record<WorkerNotificationType, NotificationCategory> = {
  task_assigned: "task",
  task_completed: "task",
  task_review: "task",
  materials_delivered: "materials",
  schedule_change: "schedule",
  photo_report_approved: "photoReport",
  photo_report_rejected: "photoReport",
  reminder: "reminder",
  problem_update: "system",
  system: "system",
};

export interface NotificationFilters {
  tab: NotificationTab;
  category: NotificationCategory | "all";
  date: string | null;
  priority: WorkerNotificationPriority | "all";
}

export const DEFAULT_NOTIFICATION_FILTERS: NotificationFilters = { tab: "all", category: "all", date: null, priority: "all" };

export function filterNotifications(items: WorkerNotification[], filters: NotificationFilters): WorkerNotification[] {
  return items.filter((n) => {
    if (filters.tab === "unread" && n.read) return false;
    if (filters.tab === "important" && n.priority !== "important") return false;
    if (filters.tab === "system" && n.priority !== "system") return false;
    if (filters.category !== "all" && TYPE_CATEGORY[n.type] !== filters.category) return false;
    if (filters.priority !== "all" && n.priority !== filters.priority) return false;
    if (filters.date && n.date.slice(0, 10) !== filters.date) return false;
    return true;
  });
}

export interface NotificationSummary {
  total: number;
  unread: number;
  important: number;
  system: number;
}

export function computeNotificationSummary(items: WorkerNotification[]): NotificationSummary {
  return {
    total: items.length,
    unread: items.filter((n) => !n.read).length,
    important: items.filter((n) => n.priority === "important").length,
    system: items.filter((n) => n.priority === "system").length,
  };
}
