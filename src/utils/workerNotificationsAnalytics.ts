import type { WorkerNotification, WorkerNotificationPriority, WorkerNotificationType } from "../types";

export type NotificationTab = "all" | "unread" | "important" | "system";

export interface NotificationFilters {
  tab: NotificationTab;
  type: WorkerNotificationType | "all";
  date: string | null;
  priority: WorkerNotificationPriority | "all";
}

export const DEFAULT_NOTIFICATION_FILTERS: NotificationFilters = { tab: "all", type: "all", date: null, priority: "all" };

export function filterNotifications(items: WorkerNotification[], filters: NotificationFilters): WorkerNotification[] {
  return items.filter((n) => {
    if (filters.tab === "unread" && n.read) return false;
    if (filters.tab === "important" && n.priority !== "important") return false;
    if (filters.tab === "system" && n.priority !== "system") return false;
    if (filters.type !== "all" && n.type !== filters.type) return false;
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
