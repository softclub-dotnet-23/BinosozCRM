import type { WorkerNotification } from "../types";

/**
 * Seed notifications for the Worker demo account (user-worker-1 / Рустам Саидов, Бригада №1).
 * Each one references a real work/material record that already exists elsewhere in the seed data
 * (work-1 "Устройство фундамента" and work-4 "Арматура A500" are brigade-1's original featured
 * works; "Цемент М400"/"Кирпич красный" are real catalog material names) rather than inventing
 * unrelated content.
 */
export const mockNotifications: WorkerNotification[] = [
  {
    id: "notif-1",
    userId: "user-worker-1",
    type: "task_assigned",
    title: "Новая задача назначена",
    description: "Арматура A500",
    date: "2026-07-27T09:15:00",
    read: false,
    relatedWorkId: "work-4",
  },
  {
    id: "notif-2",
    userId: "user-worker-1",
    type: "materials_delivered",
    title: "Материалы доставлены",
    description: "Цемент М400, Кирпич красный",
    date: "2026-07-26T13:40:00",
    read: false,
    relatedWorkId: null,
  },
  {
    id: "notif-3",
    userId: "user-worker-1",
    type: "task_completed",
    title: "Задача завершена",
    description: "Устройство фундамента",
    date: "2026-07-25T17:05:00",
    read: true,
    relatedWorkId: "work-1",
  },
  {
    id: "notif-4",
    userId: "user-worker-1",
    type: "schedule_change",
    title: "Изменение графика",
    description: "Планёрка с прорабом перенесена на 16:00",
    date: "2026-07-24T08:30:00",
    read: true,
    relatedWorkId: null,
  },
];
